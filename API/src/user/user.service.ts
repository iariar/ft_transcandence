import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UserI } from './dto/user.interface';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import AVatar from './entities/file.entity';
import { ChatService } from 'src/chat/chat.service';
import { Convo } from '../chat/entities/conversation.entity';
import { matchDto } from './dto/match.dto';
import { Match } from './entities/match.entity';
import { twoFaDto } from './dto/enable-tfa.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class UserService {
  private Transport;
  private access_token;
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
    private chatservice: ChatService,
  ) {}

  /////////////////////////
  /////////TWOFA///////////
  /////////////////////////

  async sendMail(mailOptions: any) {
    return new Promise((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        service: 'yahoo',
        auth: {
          user: process.env.NODEMAILER_EMAIL,
          pass: process.env.NODEMAILER_PASSWORD,
        },
      });

      const params = {
        from: `1337 trance <${process.env.NODEMAILER_EMAIL}>`,
        to: mailOptions.to,
        subject: mailOptions.to,
        html: mailOptions.text,
      };

      transporter.sendMail(params, function (error, info) {
        if (error) {
          reject(error);
        } else {
          resolve('Email sent: ' + info.response);
        }
      });
    });
  }

  async enableTwoFa(data: twoFaDto, userName: string) {
    const user = await this.userRepository.findOneBy({ username: userName });
    if (!user) return false;
    user.email = data.email;
    user.twoFaActivated = data.twoFaStatus;
    if (!data.twoFaStatus) user.isEmailConfirmed = false;
    await this.userRepository.save(user);
    return true;
  }

  async disableTwoFa(userName: string) {
    const user = await this.userRepository.findOneBy({ username: userName });
    if (!user) return false;
    user.twoFaActivated = false;
    user.isEmailConfirmed = false;
    await this.userRepository.save(user);
    return true;
  }

  async sendVerificationLink(Email: string, username: string) {
    try {
      const payload: { username: string } = { username: username };
      const token = await this.jwt.sign(payload, {
        secret: this.config.get('JWT2FA_VERIFICATION_TOKEN_SECRET'),
        expiresIn: `${this.config.get(
          'JWT_VERIFICATION_TOKEN_EXPIRATION_TIME',
        )}s`,
      });

      const url = `${this.config.get('EMAIL_CONFIRMATION_URL')}?token=${token}`;

      const text = `
      <h1>Welcome to Ping Pong</h1>
      <h5>To confirm the email address, click here: ${url}</h5>`;
      await this.sendMail({
        to: Email,
        subject: 'Email confirmation',
        text,
      });
    } catch (err) {
      console.log('Email not sent');
    }
  }

  async decodeConfirmationToken(token: string) {
    try {
      const payload = await this.jwt.verify(token, {
        secret: this.config.get('JWT2FA_VERIFICATION_TOKEN_SECRET'),
      });
      if (typeof payload === 'object' && 'username' in payload) {
        return payload.username;
      }
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
      }
    }
  }

  async confirmEmail(username: string) {
    if (!username) return { status: 'token expired' };

    const user = await this.userRepository.findOneBy({ username: username });
    if (!user) return { status: 'token expired' };
    if (user.isEmailConfirmed) {
      return { status: 'already confirmed' };
    }
    user.isEmailConfirmed = true;
    this.userRepository.save(user);
    return { status: 'si' };
  }

  /////////////////////////
  /////////FRIENDS/////////
  /////////////////////////

  // Modified room names with user logins instead of usernames !!!!!!!!!!
  async removeFriend(removed_friend: string, current_username: string) {
    try {
      const friend = await this.userRepository.findOne({
        where: {
          login: removed_friend,
        },
        relations: {
          friends: true,
        },
      });
      if (!friend) return false;
      const loadedUser = await this.userRepository.findOne({
        where: {
          username: current_username,
        },
        relations: {
          friends: true,
        },
      });
      if (friend.login !== loadedUser.login) {
        let index = loadedUser.friends.findIndex(
          (fr) => fr.username === friend.username,
        );
        if (index > -1) loadedUser.friends.splice(index, 1);
        index = friend.friends.findIndex(
          (user) => user.username === loadedUser.username,
        );
        if (index > -1) friend.friends.splice(index, 1);
      }
      let room = await this.convoRepository.findOne({
        where: {
          description: `${loadedUser.login}-${friend.login}`,
        },
        relations: {
          messages: true,
        },
      });
      if (!room) {
        room = await this.convoRepository.findOne({
          where: {
            description: `${friend.login}-${loadedUser.login}`,
          },
          relations: {
            messages: true,
          },
        });
      }
      if (room) {
        await this.convoRepository.remove(room);
      }
      await this.userRepository.save(loadedUser);
      await this.userRepository.save(friend);
      // console.log('loaded user :', loadedUser);

      return { status: true, login: friend.login };
    } catch {
      return { status: false };
    }
  }

  async add_friend(login: string, friend_login: string) {
    try {
      const friend = await this.userRepository.findOne({
        where: {
          login: friend_login,
        },
        relations: {
          friends: true,
          blocked: true,
        },
      });

      if (!friend) return { status: false };
      const loadedUser = await this.userRepository.findOne({
        where: {
          login: login,
        },
        relations: {
          friends: true,
          blocked: true,
        },
      });
      let index;
      if (loadedUser.blocked) {
        index = loadedUser.blocked.findIndex(
          (user) => user.username === friend.username,
        );
        if (index !== -1) return { status: 'blocked' };
      }
      if (friend.blocked) {
        index = friend.blocked.findIndex(
          (user) => user.username === loadedUser.username,
        );
        if (index !== -1) return { status: 'blocked' };
      }
      index = friend.friends.findIndex(
        (user) => user.username === loadedUser.username,
      );
      if (index !== -1) return { status: 'already friends' };
      await this.chatservice.createDm(loadedUser.login, friend_login);
      if (friend.login !== loadedUser.login) {
        loadedUser.friends.push(friend);
        friend.friends.push(loadedUser);
      } else return { status: 'it is you' };
      await this.userRepository.save(loadedUser);
      await this.userRepository.save(friend);
      return { status: true, login: friend.login, username: friend.username };
    } catch (err) {
      console.log('add_friend');
      return { status: false };
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
    });
    let friends: { username: string; login: string }[] = [];
    for (const k in loadedUser.friends) {
      friends.push({
        username: loadedUser.friends[k].username,
        login: loadedUser.friends[k].login,
      });
    }
    return friends;
  }

  async add_username(Login: string, newUsername: string) {
    try {
      if (newUsername[0] === '#') {
        return { status: 'notAllowed' };
      }
      const user = await this.userRepository.findOneBy({
        login: Login,
      });
      const user_name_check = await this.userRepository.findOneBy({
        username: newUsername,
      });
      user.username = newUsername;
      await this.userRepository.save(user);
      return { status: true };
    } catch (err) {
      return { status: false, error: err };
    }
  }

  async blocked_list(username: string) {
    let blocked: { username: string; login: string }[] = [];
    const user = await this.userRepository.findOne({
      where: {
        username: username,
      },
      relations: {
        blocked: true,
      },
    });
    for (const k in user.blocked) {
      blocked.push({
        username: user.blocked[k].username,
        login: user.blocked[k].login,
      }); // get blocked users logins
    }
    return blocked;
  }

  /////////////////////////
  /////////REGISTER////////
  /////////////////////////

  async get_tk_li(code: string) {
    let token = '';
    let ret = {
      stats: true,
      login: '',
      username: '',
      twoFa: false,
    };
    try {
      const obj = {
        grant_type: 'authorization_code',
        client_id: process.env.FORTYTWO_CLIENT_ID,
        client_secret: process.env.FORTYTWO_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.FORTYTWO_REDIRECT_URI,
      };

      const data = await this.httpService
        .post('https://api.intra.42.fr/oauth/token', obj)
        .toPromise();
      const token = data.data.access_token;
      const info = await this.httpService
        .get('https://api.intra.42.fr/v2/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      // fill user info to send to create
      let user = {} as UserI;
      user.login = info.data.login;
      ret.login = info.data.login;
      try {
        const returned_user = await this.userRepository.findOne({
          where: {
            login: user.login,
          },
          relations: {
            friends: true,
          },
        });
        if (!returned_user) {
          await this.userRepository.save(user);
        } else {
          ret.username = returned_user.username;
          ret.twoFa = returned_user.twoFaActivated;
        }
      } catch (error) {
        ret.stats = false;
        console.log('get_tk_li');
      }
    } catch (error) {
      ret.stats = false;
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return ret;
  }

  async block_user(blocked_username: string, current_username: string) {
    try {
      const blocked_user = await this.userRepository.findOneBy({
        login: blocked_username,
      });
      const user = await this.userRepository.findOne({
        where: {
          username: current_username,
        },
        relations: { blocked: true, friends: true },
      });
      user.blocked.push(blocked_user);
      this.removeFriend(blocked_user.login, current_username);
      await this.userRepository.save(user);
      return { status: true, login: blocked_user.login };
    } catch {
      return { status: false };
    }
  }

  async unblock_user(blocked_login: string, current_username: string) {
    try {
      const blocked_user = await this.userRepository.findOneBy({
        login: blocked_login,
      });
      const user = await this.userRepository.findOne({
        where: {
          username: current_username,
        },
        relations: { blocked: true },
      });
      let index = user.blocked.findIndex(
        (user) => user.username === blocked_user.username,
      );
      if (index > -1) user.blocked.splice(index, 1);
      await this.userRepository.save(user);
      return { status: true };
    } catch {
      return { status: false };
    }
  }

  async get_history(userName: string) {
    const user = this.userRepository.findOneBy({ username: userName });
  }

  async get_stats(login: string) {
    let victories = 0;
    let losses = 0;
    const user = await this.userRepository.findOne({
      where: {
        login: login,
      },
      relations: {
        history: true,
      },
    });
    if (!user) return { status: false };
    for (const i in user.history) {
      if (user.history[i].won) victories++;
      else losses++;
    }
    return {
      username: user.username,
      history: user.history,
      wins: victories,
      losses: losses,
    };
  }

  async add_to_history(username: string, matchdto: matchDto) {
    try {
      let match = this.matchRepository.create();
      match.won = matchdto.won;
      match.oppenent = matchdto.opponent;
      match = await this.matchRepository.save(match);
      const user = await this.userRepository.findOne({
        where: {
          username: username,
        },
        relations: {
          history: true,
        },
      });
      if (!user.history) user.history = [];
      user.history.push(match);
      this.userRepository.save(user);
      return { stats: true };
    } catch (err) {
      console.log('add_to_history');
      return { stats: false };
    }
  }
}
