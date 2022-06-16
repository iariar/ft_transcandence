import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository, } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UserI } from './dto/user.interface';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config';
import AVatar from './entities/file.entity';
import { createTransport } from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { ChatService } from 'src/chat/chat.service';
import { Convo } from '../chat/entities/conversation.entity';
import * as fs from 'fs';
import { matchDto } from './dto/match.dto';
import { Match } from './entities/match.entity';
import { join } from 'path';



@Injectable()
export class UserService {
	private Transport
	private access_token
	constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
		@InjectRepository(Convo)
		private readonly convoRepository: Repository<Convo>,
		@InjectRepository(Match)
		private readonly matchRepository: Repository<Match>,
		private jwt: JwtService,
		private config: ConfigService,
		@InjectRepository(AVatar)
		private readonly avatarRepo: Repository<AVatar>,
		private readonly httpService: HttpService,
		private chatservice: ChatService

	) { }

	/////////////////////////
	/////////TWOFA///////////
	/////////////////////////

	async sendMail(mailOptions: any) {
		try {

			const oauth2Client = new OAuth2Client(this.config.get('CLIENT_ID'), this.config.get('CLIENT_SECRET'), this.config.get('REDIRECT_URL'))
			oauth2Client.setCredentials({ refresh_token: this.config.get('REFRESH_TOKEN') })
			this.access_token = await oauth2Client.getAccessToken()
			this.Transport = createTransport({
				service: 'gmail',
				auth: {
					type: "OAuth2",
					user: 'arisssimane@gmail.com',
					clientId: this.config.get('CLIENT_ID'),
					clientSecret: this.config.get('CLIENT_SECRET'),
					refreshToken: this.config.get('REFRESH_TOKEN'),
					accessToken: this.access_token

				}
			})
			this.Transport.sendMail(mailOptions)
		}
		catch (err) {
			console.log('mail bullshit')
		}
	}

	async enableTwoFa(email: string, userName: string) {
		const user = await this.userRepository.findOneBy({ username: userName })
		if (!user)
			return (false)
		user.email = email
		user.twoFaActivated = true
		await this.userRepository.save(user)
		return (true)
	}

	async disableTwoFa(userName: string) {
		const user = await this.userRepository.findOneBy({ username: userName })
		if (!user)
			return (false)
		user.twoFaActivated = false
		user.isEmailConfirmed = false
		await this.userRepository.save(user)
		console.log(user)
		return (true)
	}

	async sendVerificationLink(Email: string, username: string) {
		try {
			const payload: { username: string } = { username: username };
			const token = await this.jwt.sign(payload, {
				secret: this.config.get('JWT2FA_VERIFICATION_TOKEN_SECRET'),
				expiresIn: `${this.config.get('JWT_VERIFICATION_TOKEN_EXPIRATION_TIME')}s`
			});

			const url = `${this.config.get('EMAIL_CONFIRMATION_URL')}?token=${token}`;

			const text = `Welcome to Ping Pong. To confirm the email address, click here: ${url}`;
			await this.sendMail({
				to: Email,
				subject: 'Email confirmation',
				text,
			})
		}
		catch (err) {
			console.log('sda')
		}
	}

	async decodeConfirmationToken(token: string) {
		try {
			const payload = await this.jwt.verify(token, {
				secret: this.config.get('JWT2FA_VERIFICATION_TOKEN_SECRET'),
			});

			console.log(payload)
			if (typeof payload === 'object' && 'username' in payload) {
				return payload.username;
			}
			//console.log('error')
		} catch (error) {
			if (error?.name === 'TokenExpiredError') {
				//console.log('token expired')
			}
		}
	}

	async confirmEmail(username: string) {
		if (!username)
			return ({ status: 'token expired' });

		const user = await this.userRepository.findOneBy({ username: username });
		if (!user)
			return ({ status: 'token expired' });
		if (user.isEmailConfirmed) {
			return ({ status: 'already confirmed' });
		}
		user.isEmailConfirmed = true
		this.userRepository.save(user)
		return ({ status: 'si' })
	}

	/////////////////////////
	/////////FRIENDS/////////
	/////////////////////////

	async removeFriend(removed_friend: string, current_username: string) {
		try {
			const friend = await this.userRepository.findOne({
				where: {
					username: removed_friend,
				},
				relations: {
					friends: true,
				},
			})
			if (!friend)
				return false
			const loadedUser = await this.userRepository.findOne({
				where: {
					username: current_username,
				},
				relations: {
					friends: true,
				},
			})
			if (friend.login !== loadedUser.login) {
				let index = loadedUser.friends.findIndex(friend => friend.username === friend.username)
				if (index > -1)
					loadedUser.friends.splice(index, 1)
				index = friend.friends.findIndex(user => user.username === loadedUser.username)
				if (index > -1)
					friend.friends.splice(index, 1)
			}
			let room = await this.convoRepository.findOne({
				where: {
					description: `${current_username}-${removed_friend}`
				},
				relations: {
					messages: true
				}
			})
			if (!room) {

				room = await this.convoRepository.findOne({
					where: {
						description: `${removed_friend}-${current_username}`
					},
					relations: {
						messages: true
					}
				})
			}
			await this.convoRepository.remove(room)
			await this.userRepository.save(loadedUser)
			await this.userRepository.save(friend)
			return { status: true }
		}
		catch {
			return { status: false }
		}
	}


	async add_friend(login: string, friend_username: string) {
		try {

			const friend = await this.userRepository.findOne({
				where: {
					username: friend_username,
				},
				relations: {
					friends: true,
					blocked: true
				},
			})

			if (!friend)
				return { status: false }
			const loadedUser = await this.userRepository.findOne({
				where: {
					login: login,
				},
				relations: {
					friends: true,
					blocked: true
				},
			})
			let index
			if (loadedUser.blocked) {
				index = loadedUser.blocked.findIndex(user => user.username === friend.username)
				if (index !== -1)
					return { status: 'bloked' }
			}
			if (friend.blocked) {
				index = friend.blocked.findIndex(user => user.username === loadedUser.username)
				if (index !== -1)
					return { status: 'blocked 2' }
			}
			await this.chatservice.createDm(loadedUser.username, friend_username)
			index = friend.friends.findIndex(user => user.username === loadedUser.username)
			if (index !== -1)
				return { status: 'already friends' }
			if (friend.login !== loadedUser.login) {
				await loadedUser.friends.push(friend)
				await friend.friends.push(loadedUser)
			}
			else
				return ({ status: 'it is you' })
			await this.userRepository.save(loadedUser)
			await this.userRepository.save(friend)
			return ({ status: true })
		}
		catch (err) {
			console.log(err)
			return { status: false }
		}
		// return true
	}

	async get_friends(Login: string) {
		const loadedUser = await this.userRepository.findOne({
			where: {
				login: Login,
			},
			relations: {
				friends: true,
			},
		})
		const friends: string[] = [];
		for (const k in loadedUser.friends) {
			friends.push(loadedUser.friends[k].username)
		}
		return friends
	}

	async add_username(Login: string, newUsername: string) {
		try {

			const user = await this.userRepository.findOneBy({
				login: Login
			})
			const user_name_check = await this.userRepository.findOneBy({
				username: newUsername
			})
			user.username = newUsername;
			await this.userRepository.save(user);
		}
		catch (err) {
			console.log('error saving username, probably already exists')
		}
		return true
	}


	async get_all_users() {

		return await this.userRepository.find({
			relations: {
				friends: true,
				rooms: true,
				blocked: true,
				history: true
			},
		});
	}

	async blocked_list(username: string) {
		let blocked: string[] = []
		const user = await this.userRepository.findOne({
			where: {
				username: username
			},
			relations: {
				blocked: true
			}
		})
		for (const k in user.blocked) {
			blocked.push(user.blocked[k].username)
		}
		return blocked
	}

	// async remove_user(user: LoginUserDto) {
	// 	const login = user.login;
	// 	const to_be_removed = await this.userRepository.findOneBy({ login })
	// 	if (to_be_removed) {
	// 		await this.userRepository.remove(to_be_removed);
	// 	}
	// }


	/////////////////////////
	/////////AVATAR//////////
	/////////////////////////

	async uploadDatabaseFile(dataBuffer: Buffer, filename: string) {
		const newFile = await this.avatarRepo.create({
			filename,
			data: dataBuffer
		})
		await this.avatarRepo.save(newFile)
		return newFile
	}

	async getFileById(fileId: number) {
		const file = await this.avatarRepo.findOneBy({ id: fileId });
		return file

	}

	/////////////////////////
	/////////REGISTER////////
	/////////////////////////

	async get_tk_li(code: string) {
		let token = "";
		let ret = {
			stats: true,
			login: "",
			username: "",
			twoFa: false
		}
		try {
			const data = await this.httpService.post('https://api.intra.42.fr/oauth/token', {
				"grant_type": "authorization_code",
				"client_id": process.env.FORTYTWO_CLIENT_ID,
				"client_secret": process.env.FORTYTWO_CLIENT_SECRET,
				"code": code,
				"redirect_uri": "http://localhost:4200/login"
			}).toPromise()
			const token = data.data.access_token;
			const info = await this.httpService.get('https://api.intra.42.fr/v2/me', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			}).toPromise()
			// fill user info to send to create
			let user = {} as UserI;
			user.login = info.data.login;
			ret.login = info.data.login
			try {
				const returned_user = await this.userRepository.findOne({
					where: {
						login: user.login
					},
					relations: {
						friends: true,
					},
				})
				if (!returned_user) {
					await this.userRepository.save(user);
				}
				else {
					ret.username = returned_user.username
					ret.twoFa = returned_user.twoFaActivated
				}
			}
			catch (error) {
				console.log('error getting the user profile 2')
				ret.stats = false;
				console.log(error)
			}
		}
		catch (error) {
			ret.stats = false;
			throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
			console.log('error getting the user profile 1')
			return ret
		}
		// (ret.username === undefined || ret.username === null) ? ret.username = "": 0
		return (ret)
	}

	async block_user(blocked_username: string, current_username: string) {
		try {
			const blocked_user = await this.userRepository.findOneBy({ username: blocked_username })
			const user = await this.userRepository.findOne({
				where: {
					username: current_username
				},
				relations: { blocked: true, friends: true }
			})
			user.blocked.push(blocked_user)
			this.removeFriend(blocked_user.username, current_username)
			await this.userRepository.save(user)
			return { status: true }
		}
		catch {
			return { status: false }
		}
	}

	async unblock_user(blocked_username: string, current_username: string) {
		try {
			const blocked_user = await this.userRepository.findOneBy({ username: blocked_username })
			const user = await this.userRepository.findOne({
				where: {
					username: current_username
				},
				relations: { blocked: true }
			})
			console.log(user)
			let index = user.blocked.findIndex(user => user.username === blocked_user.username)
			if (index > -1)
				user.blocked.splice(index, 1)
			await this.userRepository.save(user)
			return { status: true }
		}
		catch {
			return { status: false }
		}
	}

	async get_user_by_username(userName: string) {
		const user = await this.userRepository.findOne({
			where: {
				username: userName
			}
		})
		if (user) {
			const ret = { username: user.username/*stats and shit later*/ }
			return ret
		}
		return {}
	}

	async GetUserData(Login: string) {
		return (await this.userRepository.findOneBy({
			login: Login
		}))
	}

	async delete_all() {
		this.userRepository.clear();
		//console.log('deleted');
	}

	async get_history(userName: string) {
		const user = this.userRepository.findOneBy({ username: userName })
	}

	async get_stats(username: string) {
		let ret: {
			username: string,
			image: any,
			history: {}
		}
		const user = await this.userRepository.findOne({
			where: {
				username: username
			},
			relations: {
				history: true,
			},
		})
		ret.username = user.username
		ret.history = user.history
		ret.image = fs.readFileSync(join(process.cwd(), user.imagePath), { encoding: 'base64' })
		return ({ stats: user.userstats })
	}

	async add_to_history(username: string, matchdto: matchDto) {
		// match: Match = {
		// 	winner: matchdto.winner,
		// 	opponents: matchdto.oppenent
		// }
		try {
			let match = await this.matchRepository.create()
			console.log(matchdto);
			
			match.won = matchdto.won;
			match.oppenent = matchdto.opponent
			console.log('2');
			match = await this.matchRepository.save(match)
			console.log(username);
			const user = await this.userRepository.findOne({
				where: {
					username: username,
				},
				relations: {
					history: true
				}
			})
			console.log('3');
			if (!user.history)
				user.history = []
			console.log('3');
			user.history.push(match)
			this.userRepository.save(user)
			console.log(user.history);
			
			return ({ stats: true })
		}
		catch(err) {
			console.log('tfo')
			console.log(err)
			return ({ stats: false })
		}
	}

}
