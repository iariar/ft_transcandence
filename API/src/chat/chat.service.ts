import { Injectable } from '@nestjs/common';
import { InjectRepository, } from '@nestjs/typeorm';
import passport, { use } from 'passport';
import { relative } from 'path';
import { Repository } from 'typeorm';
import * as argon from "argon2"
import { Convo } from './entities/conversation.entity';
import { UserEntity } from '../user/entities/user.entity';
import { roomCreationDto } from 'src/chat/dto/room_creation.dto';
import { passwordVerificationDto } from 'src/chat/dto/password_verification.dto';
import { pushMsgDto } from 'src/chat/dto/push_msg.dto';
import { usernameDto } from 'src/user/dto/username.dto';
import { descriptionDto } from 'src/chat/dto/description.dto';
import { Message } from './entities/message.entity';
import { stat } from 'fs';

@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(Convo)
		private readonly convoRepository: Repository<Convo>,
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
		@InjectRepository(Message)
		private readonly msgRepository: Repository<Message>,
	) { }

	async createRoom(roomcreationdto: roomCreationDto, username: string) {
		try {
			if (roomcreationdto.description === "")
				return { status: 'empty description' }
			const user = await this.userRepository.findOne({ where: { username: username }, relations: { rooms: true } })
			let room: any = { description: roomcreationdto.description, password: "" };
			await this.convoRepository.save(room)
			const loadedroom = await this.convoRepository.findOne({
				where: {
					description: roomcreationdto.description
				},
				relations: {
					administrators: true,
					users: true,
					owner: true
				}
			})
			if (!loadedroom.administrators)
				loadedroom.administrators = []
			loadedroom.administrators.push(user)
			loadedroom.users = [user]
			loadedroom.owner = [user]
			loadedroom.private = roomcreationdto.mode
			if (roomcreationdto.password !== "") {
				loadedroom.password = await argon.hash(roomcreationdto.password)
			}
			await this.convoRepository.save(loadedroom)
			if (!user.rooms)
				user.rooms = []
			user.rooms.push(loadedroom)
			await this.userRepository.save(user)
			return { status: 'success' }
		}
		catch (err) {
			return { status: 'description already in use' }
		}
	}

	async room_has_password(room_description: string) {

		const room = await this.convoRepository.findOneBy({ description: room_description })
		if (room && room.password/*check for empty string later*/)
			return ({ status: true })
		return ({ status: false })
	}

	async verify_password(passwordverificationdto: passwordVerificationDto) {   /// room_description => description
		let verificarion: boolean = false;
		const room = await this.convoRepository.findOneBy({ description: passwordverificationdto.description })

		if (passwordverificationdto.password)
			verificarion = await argon.verify(room.password, passwordverificationdto.password)
		if (verificarion === true)
			return ({ status: true })
		return ({ status: false })
	}

	async joinRoom(userName: string, room_description: string) {
		try {
			const user = await this.userRepository.findOne({ where: { username: userName }, relations: { rooms: true } })
			const loadedRoom = await this.convoRepository.findOne({
				where: {
					description: room_description
				},
				relations: {
					users: true,
					banned: true
				}
			})
			console.log(room_description)
			if (!loadedRoom)
				return ({ status: 'no such room' })
			console.log(1)
			let index = loadedRoom.banned.findIndex(u => u.username === user.username)
			if (index > -1)
				return ({ status: 'user banned' })
			index = loadedRoom.users.findIndex(u => u.username === user.username)
			if (index > -1)
				return ({ status: 'user already in the room' })
			if (!loadedRoom.users)
				loadedRoom.users = []
			loadedRoom.users.push(user)
			await this.convoRepository.save(loadedRoom)
			if (!user.rooms)
				user.rooms = []
			user.rooms.push(loadedRoom)
			await this.userRepository.save(user)
			return ({ status: 'end' })
		}
		catch (err) {
			console.log('Error: join room')
			return ({ status: 'something went wrong / duplicating something' })
		}
	}

	async leaveRoom(userName: string, room_description: string) {
		try {

			const user = await this.userRepository.findOne({
				where: { username: userName }, relations: {
					rooms: true
				}
			})
			const loadedRoom = await this.convoRepository.findOne({
				where: {
					description: room_description
				},
				relations: {
					users: true,
					administrators: true,
					owner: true
				}
			})
			//remove from users list=
			let index = loadedRoom.users.findIndex(i => i.username === user.username)
			if (index > -1)
				loadedRoom.users.splice(index, 1)
			index = loadedRoom.owner.findIndex(i => i.username === user.username)
			//remove from owner
			if (index > -1)
				loadedRoom.owner.splice(index, 1)

			//remove from administrator list
			index = loadedRoom.administrators.findIndex(i => i.username === user.username)
			if (index > -1)
				loadedRoom.administrators.splice(index, 1)

			//remove room when last user left
			if (loadedRoom.users.length === 0)
				await this.convoRepository.remove(loadedRoom)
			else
				await this.convoRepository.save(loadedRoom)


			// remove room from user rooms list
			index = user.rooms.findIndex(room => room.description === loadedRoom.description)
			if (index > -1)
				user.rooms.splice(index, 1)
			await this.userRepository.save(user)
			return ({ status: true })
		}
		catch (err) {
			console.log('Error leaveRoom')
			return ({ status: false })
		}

	}

	async pushMsg(pushmsgdto: pushMsgDto) {
		try {
			const loadedRoom = await this.convoRepository.findOne({
				where: {
					description: pushmsgdto.description
				},
				relations: {
					messages: true,
				}
			})
			const user = await this.userRepository.findOne({ where: { username: pushmsgdto.sender } })
			let msg: any = { content: pushmsgdto.content, sender: user.username }
			if (!loadedRoom) {
				console.log('room |', pushmsgdto.description, '| does not exist',)
				return;
			}
			loadedRoom.messages.push(msg)
			await this.msgRepository.save(msg)
			await this.convoRepository.save(loadedRoom)
		}
		catch (err) {
			console.log('Error pushMsg')
			return ({ status: 'something went wrong / duplicating something' })
		}
	}

	async isPrivate(description: string) {
		const room = await this.convoRepository.findOneBy({ description: description })
		if (!room || !room.private)
			return { status: false }
		return { status: true }

	}

	async get_user_rooms(username: string) {
		let obj: { description: string, private: boolean, status: string } = { description: "", private: false, status: "user" }
		let arr: { description: string, private: boolean, status: string }[] = []
		let stats = "user"
		const loadeduser = await this.userRepository.findOne({
			where: { username: username },
			relations: {
				rooms: true,
			}
		})
		for (const k in loadeduser.rooms) {
			let room = await this.convoRepository.findOne({ where: { description: loadeduser.rooms[k].description }, relations: { owner: true, administrators: true } })
			if (room.owner.length < 2) {
				let index = room.administrators.findIndex(u => u.username === username)
				if (index !== -1)
					stats = "administrator"
				index = room.owner.findIndex(u => u.username === username)
				if (index !== -1)
					stats = "owner"
				obj = {
					description: loadeduser.rooms[k].description,
					private: loadeduser.rooms[k].private,
					status: stats

				}
				arr.push(obj)
			}
		}
		return arr
	}

	async roomUsers(descriptiondto: descriptionDto) {
		let users: { user: string, muted: boolean, status: string }[] = []
		let muted: boolean = false
		let status: string = "user"

		const room = await this.convoRepository.findOne({
			where: {
				description: descriptiondto.description
			},
			relations: {
				users: true,
				muted: true,
				owner: true,
				administrators: true
			}
		})
		if (room) {
			for (const k in room.users) {
				status = "user"
				muted = false
				let index = room.muted.findIndex(u => u.username === room.users[k].username)
				if (index > -1)
					muted = true
				index = room.administrators.findIndex(u => u.username === room.users[k].username)
				if (index > -1)
					status = "administrator"
				index = room.owner.findIndex(u => u.username === room.users[k].username)
				if (index > -1)
					status = "owner"
				users.push({ user: room.users[k].username, muted: muted, status: status })
			}
			// console.log(users)
			return users
		}
		else
			return ['room not found']
	}

	async get_room_descriptions() {
		let obj: { description: string, hasPass: boolean } = { description: "", hasPass: false }
		let arr: { description: string, hasPass: boolean }[] = []
		const rooms = await this.convoRepository.find({ relations: { owner: true } })
		for (const k in rooms) {
			if (!rooms[k].private && rooms[k].owner.length < 2) {
				obj = {
					description: rooms[k].description,
					hasPass: false
				}
				if (rooms[k].password && rooms[k].password !== "")
					obj.hasPass = true
				arr.push(obj)
			}
		}
		return arr
	}

	async get_room_descriptions_private() {
		let obj: { description: string, hasPass: boolean } = { description: "", hasPass: false }
		let arr: { description: string, hasPass: boolean }[] = []
		const rooms = await this.convoRepository.find({ relations: { owner: true } })
		for (const k in rooms) {
			if (rooms[k].private && rooms[k].owner.length < 2) {
				obj = {
					description: rooms[k].description,
					hasPass: false
				}
				if (rooms[k].password && rooms[k].password !== "")
					obj.hasPass = true
				arr.push(obj)
			}
		}
		return arr
	}

	async createDm(current_user: string, friend_username: string) {
		try {
			const user = await this.userRepository.findOne({
				where: {
					username: current_user
				},
				relations: {
					rooms: true
				}
			})
			const friend = await this.userRepository.findOne({
				where: {
					username: friend_username
				},
				relations: {
					rooms: true
				}
			})
			let room = await this.convoRepository.create()
			room.description = `${user.username}-${friend.username}`
			room.owner = [user, friend]
			const new_room = await this.convoRepository.save(room)
			friend.rooms.push(new_room)
			user.rooms.push(new_room)
			this.userRepository.save(user)
			this.userRepository.save(friend)
		}
		catch (err) {
			console.log('Error creatDm')
			return ({ status: 'something went wrong / duplicating something' })
		}
	}


	async find_dm(current_user: string, friend_username: string) {
		let room = await this.convoRepository.findOne({
			where: {
				description: `${current_user}-${friend_username}`
			},
			relations: {
				messages: true
			}
		})
		if (!room) {
			room = await this.convoRepository.findOne({
				where: {
					description: `${friend_username}-${current_user}`
				},
				relations: {
					messages: true
				}
			})
		}
		let ret = await this.get_room_messages(room.description, current_user)
		for (let i in ret) {
			ret[i].print = false
		}
		return ret
	}

	async pushDm(pushmsgdto: pushMsgDto, current_user: string) {
		try {
			let msg: any = { content: pushmsgdto.content, sender: pushmsgdto.sender }
			let new_msg = await this.msgRepository.save(msg)
			const room_second_user = pushmsgdto.description

			const user = await this.userRepository.findOne({ where: { username: current_user }, relations: { rooms: true } })

			let index = user.rooms.findIndex(u => u.description === `${room_second_user}-${user.username}`)
			let index2 = user.rooms.findIndex(u => u.description === `${user.username}-${room_second_user}`)
			let i = index > -1 ? index : index2
			let room = await this.convoRepository.findOne({
				where: {
					description: `${current_user}-${room_second_user}`
				},
				relations: {
					messages: true
				}
			})
			if (!room) {

				room = await this.convoRepository.findOne({
					where: {
						description: `${room_second_user}-${current_user}`
					},
					relations: {
						messages: true
					}
				})
			}
			if (!room.messages)
				room.messages = []
			room.messages.push(new_msg)
			await this.msgRepository.save(room.messages)
			user.rooms[i] = await this.convoRepository.save(room)
			await this.userRepository.save(user)
		}
		catch (err) {
			console.log('Error pushMsg')
			return ({ status: 'something went wrong / duplicating something' })
		}
	}

	async check_if_admin_or_owner(description: string, current_username: string) {
		const obj = { administrator: false, owner: false }
		const loadedRoom = await this.convoRepository.findOne({
			where: {
				description: description
			},
			relations: {
				owner: true,
				administrators: true
			}
		})
		let index = loadedRoom.owner.findIndex(u => u.username === current_username)
		if (index > -1)
			obj.administrator = true
		index = loadedRoom.administrators.findIndex(u => u.username === current_username)
		if (index > -1)
			obj.owner = true
		return (obj)
	}

	async bann_user(room_description: string, banned_username: string) {
		try {
			const user = await this.userRepository.findOneBy({ username: banned_username })
			const room = await this.convoRepository.findOne({
				where: {
					description: room_description
				},
				relations: {
					banned: true,
					owner: true
				}
			})
			let index = room.owner.findIndex(u => u.username === banned_username)
			if (index > -1)
				return ({ stats: "owner" })
			this.leaveRoom(user.username, room_description)
			room.banned.push(user)
			this.convoRepository.save(room)
			let repo = this.convoRepository
			setTimeout(function () {
				const index = room.banned.indexOf(user)
				if (index > -1)
					room.banned.splice(index, 1)
				repo.save(room)
				console.log('unbanned')
			}, 300000)
			return { stats: true }
		}
		catch (err) {
			return { stats: false }
		}
	}

	async mute_user(room_description: string, muted_username: string) {
		try {
			console.log(muted_username)
			const room = await this.convoRepository.findOne({
				where: {
					description: room_description
				},
				relations: {
					muted: true,
					owner: true
				}
			})
			let index = room.owner.findIndex(u => u.username === muted_username)
			if (index > -1)
				return ({ status: 'owner' })
			const user = await this.userRepository.findOneBy({ username: muted_username })
			room.muted.push(user)
			this.convoRepository.save(room)
			console.log(room)
			let repo = this.convoRepository
			setTimeout(function () {
				const index = room.muted.indexOf(user)
				if (index > -1)
					room.muted.splice(index, 1)
				repo.save(room)
				console.log('unbanned')
			}, 300000)
			return { status: true }
		}
		catch (err) {
			console.log('Error muteUser')
			return ({ status: 'something went wrong / duplicating something' })
		}
	}

	async kick_user(userName: string, room_description: string) {
		let ret = await this.check_if_admin_or_owner(room_description, userName)
		if (!ret.owner) {
			return this.leaveRoom(userName, room_description)
		}
		return { status: 'owner' }
	}


	async add_password(password: string, description: string) {
		let room = await this.convoRepository.findOneBy({ description: description })
		if (!room) {
			console.log('room not found')
			return;
		}
		room.password = await argon.hash(password)
	}

	async set_new_password(room_description: string, new_pass: string) {
		try {
			const room = await this.convoRepository.findOne({
				where: {
					description: room_description
				}
			})
			if (new_pass === "") {
				room.password = "";
			}
			else {
				if (await argon.verify(room.password, new_pass))
					return { status: "same" }
				room.password = await argon.hash(new_pass)
			}
			this.convoRepository.save(room)
			return ({ status: true })
		}
		catch {
			return ({ status: false })
		}
	}

	async remove_password(room_description: string) {
		const room = await this.convoRepository.findOne({
			where: {
				description: room_description
			}
		})
		room.password = null
		this.convoRepository.save(room)
	}

	async add_administrator(room_description: string, new_admin_username: string, set: boolean) {
		try {
			const room = await this.convoRepository.findOne({
				where: {
					description: room_description
				},
				relations: {
					administrators: true
				}
			})
			const new_admin = await this.userRepository.findOneBy({ username: new_admin_username })
			if (set) {
				if (!room.administrators)
					room.administrators = [new_admin]
				else
					room.administrators.push(new_admin)
			}
			else {

				let index = room.administrators.findIndex(user => user.username === new_admin_username)
				if (index > -1)
					room.administrators.splice(index, 1)
			}
			this.convoRepository.save(room)
			return ({ status: true })
		}
		catch (err) {
			console.log('Error add_administrator')
			return ({ status: false })
		}
	}

	// async remove_from_banned(user: UserEntity, convo: Convo) {
	// 	const index = convo.banned.indexOf(user)
	// 	if (index > -1)
	// 		convo.banned.splice(index, 1)
	// }

	async unmute_user(room_description: string, muted_username: string) {
		const user = await this.userRepository.findOneBy({ username: muted_username })
		const room = await this.convoRepository.findOne({
			where: {
				description: room_description
			},
			relations: {
				muted: true
			}
		})
		let index = room.muted.findIndex(u => u.username === muted_username)
		if (index > -1)
			room.muted.splice(index, 1)

	}

	async get_room_messages(description: string, current_user: string) {
		let obj: { content: string, sender: string, print: boolean } = { content: "", sender: "", print: true }
		let arr: { content: string, sender: string, print: boolean }[] = []
		let prev: string = ""
		let print = true
		const user = await this.userRepository.findOne({
			where: {
				username: current_user
			},
			relations: {
				blocked: true
			}
		})
		const loadedRoom = await this.convoRepository.findOne({
			where: {
				description: description
			},
			relations: {
				messages: true
			}
		})
		if (loadedRoom) {
			for (const k in loadedRoom.messages) {
				print = true
				if (loadedRoom.messages[k].sender === prev) {
					print = false
				}
				obj = {
					content: loadedRoom.messages[k].content,
					sender: loadedRoom.messages[k].sender,
					print: print

				}
				let index = user.blocked.findIndex(u => u.username === obj.sender)
				if (index === -1)
					arr.push(obj)
				prev = loadedRoom.messages[k].sender
			}
		}
		return arr
	}

	async get_rooms() {
		return (this.convoRepository.find(
			{ relations: { administrators: true, users: true, banned: true, muted: true, messages: true, owner: true } }
		))
	}
}
