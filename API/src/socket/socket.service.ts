import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ServerData } from './ServerData';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private jwt: JwtService, private configService: ConfigService) {}
  serverData: ServerData = new ServerData();
  n = 0;

  // {'rel-hada': {name: 'reda', playingRoom: '', friend: []}}

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('AppGateway');

  newState: any = {};

  userIsMuted(login: string, room: string) {
    if (
      this.newState[room] &&
      this.newState[room].muted.length &&
      this.newState[room].muted.includes(login)
    )
      return true;
    return false;
  }

  @SubscribeMessage('chat')
  handleChat(client: Socket, payload: any): void {
    if (payload.command === 'joinRooms') {
      for (let i in payload.data.publicRooms)
        client.join(payload.data.publicRooms[i].data.description);
      for (let i in payload.data.privateRooms)
        client.join(payload.data.privateRooms[i].description);
    } else if (
      payload.command === 'sendMessageToServer' &&
      !this.userIsMuted(payload.data.login, payload.data.room)
    ) {
      this.server.to(payload.data.room).emit('chat', {
        command: 'broadcastToRoom',
        data: {
          content: payload.data.content,
          sender: payload.data.sender,
          room: payload.data.room,
          login: payload.data.login,
        },
      });
    } else if (payload.command === 'joinedRoom') {
      client.join(payload.room);
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].login).emit('chat', {
          command: 'joinedRoom',
          user: payload.user,
          room: payload.room,
          login: payload.login,
        });
      }
    } else if (payload.command === 'createRoom') {
      client.join(payload.room);
      this.server.emit('chat', {
        command: 'createRoom',
        room: payload.room,
        isPrivate: payload.isPrivate,
        hasPass: payload.hasPass,
      });
    } else if (payload.command === 'leaveRoom') {
      // client.leave(payload.room);
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].login).emit('chat', {
          command: 'leaveRoom',
          login: payload.user,
          room: payload.room,
          roomUsers: payload.roomUsers,
        });
      }
    } else if (payload.command === 'banned') {
      // client.leave(payload.room);
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].login).emit('chat', {
          command: 'banned',
          login: payload.login,
          index: payload.index,
          room: payload.room,
        });
      }
    } else if (payload.command === 'mute') {
      if (!this.newState[payload.room])
        this.newState[payload.room] = {
          muted: [],
        };

      if (!this.newState[payload.room].muted.includes(payload.login)) {
        this.newState[payload.room].muted.push(payload.login);
        this.server.to(payload.login).emit('chat', {
          command: 'mute',
          muted: true,
          login: payload.login,
          room: payload.room,
        });
        setTimeout(() => {
          this.newState[payload.room].muted.splice(payload.login, 1);
          this.server.to(payload.login).emit('chat', {
            command: 'mute',
            muted: false,
            login: payload.login,
            room: payload.room,
          });
        }, 300000);
      }
    } else if (payload.command === 'kick') {
      // client.leave(payload.room);
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].login).emit('chat', {
          command: 'kick',
          login: payload.user,
          room: payload.room,
          roomUsers: payload.roomUsers,
        });
      }
    } else if (payload.command === 'changePassword') {
      this.server.emit('chat', {
        command: 'changePassword',
        room: payload.room,
        state: payload.state,
        hasPass: payload.hasPass,
      });
    } else if (payload.command === 'setAdmin') {
      this.server.emit('chat', {
        command: 'setAdmin',
        room: payload.room,
        login: payload.login,
        action: payload.action,
      });
    } else if (payload.command === 'unblockFriend') {
      this.server.emit('chat', {
        command: 'unblockFriend',
        friend: payload.friend,
      });
    } else if (payload.command === 'deleteRoom') {
      this.server.emit('chat', {
        command: 'deleteRoom',
        room: payload.room,
        private: payload.private,
      });
    } else if (payload.command === 'closeOverlay') {
      this.server.to(client.handshake.query.name).emit('overlay', {
        command: 'closeOverlay',
      });
    }
  }

  @SubscribeMessage('game')
  async handleGame(client: Socket, payload) {
    if (payload.command === 'invite') {
      let res = this.serverData.invite(payload.data[1]);
      if (res !== undefined && payload.data[0] !== payload.data[1]) {
        this.server.to(res).emit('fromGame', {
          command: 'invited',
          data: {
            login: this.serverData.getUser(payload.data[0]),
            uuid: client.handshake.query.uuid,
          },
        });
      }
    } else if (payload.command === 'matchFound') {
      let p1, p2, p1Id, p2Id;
      (p1 = payload.data.login), (p2 = payload.data.enemyLogin);

      p1Id = this.serverData.getKeyByValue(p1);
      p2Id = this.serverData.getKeyByValue(p2);
      if (p1Id === undefined || p2Id === undefined) return;
      if (
        this.serverData.getUserRoom(p1) !== '' ||
        this.serverData.getUserRoom(p2) !== ''
      ) {
        if (payload.data.sentFrom === 'invite') {
          this.server.to(client.handshake.query.name).emit('fromGame', {
            command: 'alreadyInGame',
          });
        }
        return;
      }
      this.serverData.createRoom(p1, p2, p1 + '_' + p2);
      this.server.to(client.handshake.query.uuid).emit('fromGame', {
        command: 'startGame',
        data: {
          position: 0,
          room: p1 + '_' + p2,
          enemyName: p2,
          enemyID: payload.data.enemyId,
          ballDirect: this.serverData.getRoom(p1 + '_' + p2).getDirection(),
        },
      });
      this.server.to(payload.data.enemyId).emit('fromGame', {
        command: 'startGame',
        data: {
          position: 1,
          room: p1 + '_' + p2,
          enemyName: p1,
          enemyID: client.handshake.query.uuid,
          ballDirect: this.serverData.getRoom(p1 + '_' + p2).getDirection(),
        },
      });
    } else if (payload.command === 'updateDirection') {
      this.server.to(payload.data.id).emit('fromGame', {
        command: 'updateDirect',
        position: payload.data.postition,
        direct: payload.data.direct,
      });
      if (this.serverData.getRoom(payload.data.room) === undefined) return;
      let spect = this.serverData.getRoom(payload.data.room).getSpectators();
      for (let e in spect) {
        this.server.to(e).emit('fromGame', {
          command: 'updateDirect',
          position: payload.data.postition,
          direct: payload.data.direct,
        });
      }
    } else if (payload.command === 'won') {
      if (this.serverData.getRoom(payload.data.room) === undefined) return;
      this.serverData.getRoom(payload.data.room).setDirection();
      let newDirect = this.serverData.getRoom(payload.data.room).getDirection();

      this.server.to(payload.data.id).emit('fromGame', {
        command: 'won-newDirect',
        data: { newDirect: newDirect },
      });
      this.server
        .to(client.handshake.query.uuid)
        .emit('fromGame', { command: 'newDirect', data: newDirect });
      this.serverData
        .getRoom(payload.data.room)
        .setScore(payload.data.position);

      let spect = this.serverData.getRoom(payload.data.room).getSpectators();
      for (let e in spect) {
        this.server.to(e).emit('fromGame', {
          command: 'won-newDirect',
          data: { newDirect: newDirect, position: payload.data.position },
        });
      }
    } else if (payload.command === 'leftGame') {
      if (this.serverData.getRoom(payload.room) !== undefined) {
        this.serverData.setPlayingRoom(client.handshake.query.uuid);
        let spect = this.serverData.getRoom(payload.room).getSpectators();
        for (let e in spect) {
          this.server.to(e).emit('fromGame', {
            command: 'notifySpectator',
          });
        }
        this.serverData.deleteRoom(payload.room);
        this.server.emit('spectateRooms', {
          command: 'deleteRoom',
          room: payload.room,
        });
        if (payload.ended === false) {
          this.server.to(payload.enemy).emit('fromGame', {
            command: 'enemyLeft',
            data: client.handshake.query.name,
          });
        }
      } else this.serverData.setPlayingRoom(client.handshake.query.name);
    } else if (payload.command === 'spectate') {
      let userId = this.serverData.getKeyByValue(payload.data.name);
      if (userId !== undefined) {
        let room = this.serverData.getUserRoom(userId);

        if (this.serverData.getRoom(room) !== undefined) {
          let tmp = room.split('_');
          if (
            client.handshake.query.name === tmp[0] ||
            client.handshake.query.name === tmp[1]
          )
            return;
          this.serverData.getRoom(room).addSpectator({
            id: client.id,
            name: this.serverData.getUser(payload.data.specatorName),
          });
          this.server.to(payload.data.specatorName).emit('fromGame', {
            command: 'spectate',
            data: {
              position: 3,
              room: room,
              score: this.serverData.getRoom(room).getScore(),
              paddles: this.serverData.getRoom(room).getPaddle(),
            },
          });
        }
      }
    } else if (payload.command === 'spectateRoom') {
      if (this.serverData.getRoom(payload.room) !== undefined) {
        let tmp = payload.room.split('_');
        if (
          client.handshake.query.name === tmp[0] ||
          client.handshake.query.name === tmp[1]
        )
          return;

        this.serverData.getRoom(payload.room).addSpectator({
          id: client.id,
          name: this.serverData.getUser(client.handshake.query.name),
        });

        this.server.to(client.handshake.query.uuid).emit('fromGame', {
          command: 'spectate',
          data: {
            position: 3,
            room: payload.room,
            score: this.serverData.getRoom(payload.room).getScore(),
            paddles: this.serverData.getRoom(payload.room).getPaddle(),
          },
        });
      }
    } else if (payload.command === 'requestRooms') {
      let rooms = this.serverData.getRooms();
      this.server.to(client.handshake.query.name).emit('spectateRooms', {
        command: 'getRooms',
        rooms: rooms,
      });
    } else if (payload.command === 'addToQ') {
      this.serverData.addToQ(payload.username, client.handshake.query.uuid);
    } else if (payload.command === 'requestMatch') {
      let enemy = this.serverData.queueTwoPlayers(payload.username);
      if (enemy !== false) {
        this.server.to(client.handshake.query.uuid).emit('fromGame', {
          command: 'QFound',
          enemyLogin: enemy.login,
          enemyId: enemy.uuid,
        });
        this.server.to(enemy.uuid).emit('fromGame', {
          command: 'QFound-start-match',
          enemyLogin: payload.username,
          enemyId: client.handshake.query.uuid,
        });
        this.serverData.deleteFromQ(payload.username);
        this.serverData.deleteFromQ(enemy.login);
        this.server.to(enemy.login).emit('fromGame', {
          command: 'resetQueueBtns',
        });
        this.server.to(client.handshake.query.name).emit('fromGame', {
          command: 'resetQueueBtns',
        });
      }
    } else if (payload.command === 'deletefromQ') {
      this.serverData.deleteFromQ(payload.username);
    }
  }

  @SubscribeMessage('paddle')
  handlePaddle(client: Socket, payload: any): void {
    if (this.serverData.getRoom(payload.room) === undefined) return;
    this.serverData
      .getRoom(payload.room)
      .setPaddle(payload.position, payload.move);
    let spect = this.serverData.getRoom(payload.room).getSpectators();
    client.to(payload.id).emit('sendToPlayer', {
      position: -1,
      move: payload.move,
    });
    for (let e in spect) {
      this.server.to(e).emit('sendToPlayer', {
        position: payload.position,
        move: payload.move,
      });
    }
  }

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  @SubscribeMessage('auth')
  handleAuth(client: Socket, payload: any): void {
    if (payload === 'disconnect') {
      client.disconnect();
    }
  }

  @SubscribeMessage('friends')
  handleFriends(client: Socket, payload: any): void {
    if (payload.command === 'checkFriend') {
      for (let i in payload.friends) {
        if (
          this.serverData.checkOnline(payload.friends[i].login) !== undefined
        ) {
          this.server.to(payload.friends[i].login).emit('friends', {
            command: 'online',
            friendName: client.handshake.query.name,
          });
          payload.friends[i].status = 1;
        }
      }
      this.serverData.setFriends(client.handshake.query.name, payload.friends);
      this.server.to(client.handshake.query.name).emit('friends', {
        command: 'updatedFriends',
        friends: payload.friends,
      });
    } else if (payload.command === 'ingame') {
      let user = this.serverData.checkOnline(client.handshake.query.name);
      if (user !== undefined) {
        let friends = user.friends;
        for (let i in friends) {
          if (this.serverData.checkOnline(friends[i].login) !== undefined) {
            this.server.to(friends[i].login).emit('friends', {
              command: 'ingame',
              friendName: client.handshake.query.name,
            });
          }
        }
      }
    } else if (payload.command === 'addFriend') {
      let tmp = 0;
      if (this.serverData.checkOnline(payload.friendLogin) !== undefined)
        tmp = 1;
      this.server.to(client.handshake.query.name).emit('friends', {
        command: 'receiveAdded',
        friend: payload.friend,
        login: payload.friendLogin,
        status: tmp,
      });
      this.server
        .to(payload.friendLogin)
        .to(client.handshake.query.name)
        .emit('chat', {
          command: 'receiveAdded',
          adderLogin: client.handshake.query.name,
          adderName: payload.adderName,
          friend: payload.friend,
          login: payload.friendLogin,
        });
      this.serverData.addFriend(
        client.handshake.query.name,
        payload.friend,
        payload.friendLogin,
        tmp,
      );
      if (tmp === 0) return;

      this.server.to(payload.friendLogin).emit('friends', {
        command: 'receiveAdded',
        friend: payload.adderName,
        login: client.handshake.query.name,
        status: 1,
      });
      this.serverData.addFriend(
        payload.friendLogin,
        payload.adderName,
        client.handshake.query.name,
        1,
      );
    } else if (payload.command === 'removeFriend') {
      this.server.to(payload.friend).emit('friends', {
        command: 'removeFriend',
        friend: client.handshake.query.name,
      });
      this.server
        .to(payload.friend)
        .to(client.handshake.query.name)
        .emit('chat', {
          command: 'removeFriend',
          friend: payload.friend,
          friendUsername: payload.friendUsername,
          username: payload.username,
          removing: client.handshake.query.name,
        });
    } else if (payload.command === 'blockFriend') {
      this.server.to(payload.friend).emit('friends', {
        command: 'removeFriend',
        friend: client.handshake.query.name,
      });
      this.server
        .to(client.handshake.query.name)
        .to(payload.friend)
        .emit('chat', {
          command: 'blockFriend',
          friend: payload.friend,
          friendUsername: payload.friendUsername,
          login: payload.login,
          blocker: client.handshake.query.name,
          username: payload.username,
        });
    } else if (payload.command === 'updateUsername') {
      this.serverData.updateOnlineList(payload.username, payload.newUsername);
      this.server.emit('friends', {
        command: 'updateUsername',
        username: payload.username,
        newUsername: payload.newUsername,
      });
      this.server.emit('chat', {
        command: 'updateUsername',
        username: payload.username,
        newUsername: payload.newUsername,
      });
    }
  }

  handleDisconnect(client: Socket) {
    let user = this.serverData.checkOnline(client.handshake.query.name);
    if (user === undefined) {
      this.serverData.deleteUser(client.handshake.query.name);
      return;
    }
    let friends = user.friends;

    if (user.playingRoom !== '') {
      if (this.serverData.getRoom(user.playingRoom) !== undefined) {
        let tmp = user.playingRoom.split('_');
        let enemy = tmp[0] === client.handshake.query.name ? tmp[1] : tmp[0];

        this.server.emit('spectateRooms', {
          command: 'deleteRoom',
          room: user.playingRoom,
        });

        let spect = this.serverData.getRoom(user.playingRoom).getSpectators();
        for (let e in spect) {
          this.server.to(e).emit('fromGame', {
            command: 'notifySpectator',
          });
        }
        this.serverData.deleteRoom(user.playingRoom);

        this.server.to(enemy).emit('fromGame', {
          command: 'enemyLeft',
          data: client.handshake.query.name,
        });
        // }
        this.serverData.setPlayingRoom(client.handshake.query.name);
      } else this.serverData.setPlayingRoom(client.handshake.query.name);
      // }
    }
    for (let i in friends) {
      if (this.serverData.checkOnline(friends[i].login) !== undefined) {
        this.server.to(friends[i].login).emit('friends', {
          command: 'offline',
          friendName: client.handshake.query.name,
        });
      }
    }
    this.serverData.deleteUser(client.handshake.query.name);
    client.disconnect();
  }
  async handleConnection(client: Socket, ...args: any[]) {
    let userId = this.serverData.getKeyByValue(client.handshake.query.name);
    let token: string = client.handshake.query.token as string;
    try {
      const payload = await this.jwt.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      client.disconnect();
      return;
    }
    client.join(client.handshake.query.name);
    client.join(client.handshake.query.uuid);
    if (userId !== undefined) {
      this.serverData.deleteUser(userId);
    }
    this.serverData.setUser(client.handshake.query.name);
  }
}
