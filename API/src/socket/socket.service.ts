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
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private jwt: JwtService,
    private configService: ConfigService,
  ) { }
  serverData: ServerData = new ServerData();
  n = 0;

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('AppGateway');
  mutedUsers: any = {
    // user: {
    //   rooms: [],
    // },
  };

  newState: any = {
    // room1: {
    //   muted: [],
    // },
  };

  roomExists(payload: any) {
    return this.mutedUsers[payload.username]?.rooms === undefined
      ? []
      : this.mutedUsers[payload.username]?.rooms;
  }

  userIsMuted(username: string, room: string) {
    if (
      this.newState[room] &&
      this.newState[room].muted.length &&
      this.newState[room].muted.includes(username)
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
      !this.userIsMuted(payload.data.sender, payload.data.room)
    ) {
      console.log('send message :', payload);

      this.server.to(payload.data.room).emit('chat', {
        // check if the user is muted, if not save his incoming message, if yes do not save !!!!!!
        //db.query('inder.....').then(you can emit now).catch(DON'T EMIT)
        command: 'broadcastToRoom',
        data: {
          content: payload.data.content,
          sender: payload.data.sender,
          room: payload.data.room,
        },
      });
    } else if (payload.command === 'joinedRoom') {
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].user).emit('chat', {
          command: 'joinedRoom',
          user: payload.user,
        });
      }
    } else if (payload.command === 'createRoom') {
      this.server.emit('chat', {
        command: 'createRoom',
        room: payload.room,
        isPrivate: payload.isPrivate,
        hasPass: payload.hasPass,
      });
    } else if (payload.command === 'leaveRoom') {
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].user).emit('chat', {
          command: 'leaveRoom',
          user: payload.user,
          room: payload.room,
        });
      }
    } else if (payload.command === 'banned') {
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].user).emit('chat', {
          command: 'banned',
          user: payload.user,
          index: payload.index,
        });
      }
    } else if (payload.command === 'mute') {
      // console.log('server payload :', payload);
      if (!this.newState[payload.room])
        this.newState[payload.room] = {
          muted: [],
        };

      if (!this.newState[payload.room].muted.includes(payload.username)) {
        this.newState[payload.room].muted.push(payload.username);
        this.server.to(payload.username).emit('chat', {
          command: 'mute',
          muted: true,
          user: payload.username,
          room: payload.room,
        });
        setTimeout(() => {
          this.newState[payload.room].muted.splice(payload.username, 1);
          this.server.to(payload.username).emit('chat', {
            command: 'mute',
            muted: false,
            user: payload.username,
            room: payload.room,
          });
          console.log('room mchaaat :', this.newState);
        }, 300000);
        console.log('muted users :', this.newState);
      }
    } else if (payload.command === 'kick') {
      for (let u in payload.roomUsers) {
        this.server.to(payload.roomUsers[u].user).emit('chat', {
          command: 'kick',
          user: payload.user,
          room: payload.room,
        });
      }
    } else if (payload.command === 'changePassword') {
      this.server.emit('chat', {
        command: 'changePassword',
        room: payload.room,
        state: payload.state,
      });
    } else if (payload.command === 'setAdmin') {
      console.log('admin server', payload);
      this.server.emit('chat', {
        command: 'setAdmin',
        room: payload.room,
        username: payload.username,
        action: payload.action,
      });
    }
    // this.server.to(payload.username).emit('chat', {
    //   command: 'mute',
    //   user: payload.username,
    //   room: payload.room,
    // });
  }
  // if (payload.command === "privMsg") {
  // 	this.server.to(payload.data.receiver).emit("chat", {
  // 		// command: "broadcastToFriend",
  // 		data: {
  // 			content: payload.data.content,
  // 			sender: payload.data.sender,
  // 			receiver: payload.data.receiver,
  // 		}
  // 	})
  // }
  // client.broadcast.emit('msgToClient', payload);

  @SubscribeMessage('game')
  async handleGame(client: Socket, payload) {
    if (payload.command === 'invite') {
      let res = this.serverData.invite(payload.data[1]);
      if (res !== undefined) {
        this.server.to(res).emit('fromGame', {
          command: 'invited',
          data: this.serverData.getUser(payload.data[0]),
        });
      }
    } else if (payload.command === 'matchFound') {
      let p1, p2, p1Id, p2Id;

      console.log('queued : ', payload.data);
      (p1 = payload.data[0]), (p2 = payload.data[1]);
      p1Id = this.serverData.getKeyByValue(p1);
      p2Id = this.serverData.getKeyByValue(p2);
      if (p1Id === undefined || p2Id === undefined) return;

      this.serverData.createRoom(p1, p2, p1 + '-' + p2);
      this.server.to(p1).emit('fromGame', {
        command: 'startGame',
        data: {
          position: 0,
          room: p1 + '-' + p2,
          enemyName: p2,
          enemyID: p2,
          ballDirect: this.serverData.getRoom(p1 + '-' + p2).getDirection(),
        },
      });
      this.server.to(p2).emit('fromGame', {
        command: 'startGame',
        data: {
          position: 1,
          room: p1 + '-' + p2,
          enemyName: p1,
          enemyID: p1,
          ballDirect: this.serverData.getRoom(p1 + '-' + p2).getDirection(),
        },
      });
      // client.broadcast.emit("spectateRooms", {
      //   command: "addRoom",
      //   room: p1 + "-" + p2
      // })
    } else if (payload.command === 'updateDirection') {
      this.server.to(payload.data.id).emit('fromGame', {
        command: 'updateDirect',
        position: payload.data.postition,
        direct: payload.data.direct,
      });
      let spect = this.serverData.getRoom(payload.data.room).getSpectators();
      for (let e in spect) {
        this.server.to(e).emit('fromGame', {
          command: 'updateDirect',
          position: payload.data.postition,
          direct: payload.data.direct,
        });
      }
    } else if (payload.command === 'won') {
      this.serverData.getRoom(payload.data.room).setDirection();
      let newDirect = this.serverData.getRoom(payload.data.room).getDirection();

      this.server
        .to(payload.data.id)
        .emit('fromGame', {
          command: 'won-newDirect',
          data: { newDirect: newDirect },
        });
      this.server
        .to(payload.data.player)
        .emit('fromGame', { command: 'newDirect', data: newDirect });
      this.serverData
        .getRoom(payload.data.room)
        .setScore(payload.data.position);
      let spect = this.serverData.getRoom(payload.data.room).getSpectators();
      for (let e in spect) {
        this.server
          .to(e)
          .emit('fromGame', {
            command: 'won-newDirect',
            data: { newDirect: newDirect, position: payload.data.position },
          });
      }
    } else if (payload.command === 'leftGame') {
      console.log('left : ', payload);

      if (this.serverData.getRoom(payload.room) !== undefined) {
        console.log('\n insidde \n', payload.room);

        this.serverData
          .getRoom(payload.room)
          .setPlayersStatus(payload.position);
        let positions = this.serverData.getRoom(payload.room).getPlayerStatus();
        console.log('\n\n psitionnsns \n', positions, '\n\n');
        if (positions.player0 === false && positions.player1 === false) {
          this.serverData.deleteRoom(payload.room);
          this.server.emit('spectateRooms', {
            command: 'deleteRoom',
            room: payload.room,
          });
        } else if (
          (positions.player0 === false && positions.player1 === true) ||
          (positions.player0 === true && positions.player1 === false)
        ) {
          console.log(
            '\n\n sendinng left \n',
            'enemy : ',
            payload.enemy,
            '\n\n',
          );

          if (payload.ended === false) {
            this.server.to(payload.enemy).emit('fromGame', {
              command: 'enemyLeft',
              data: client.handshake.query.name,
            });
          }
        }
      }
    } else if (payload.command === 'spectate') {
      let userId = this.serverData.getKeyByValue(payload.data.name);
      if (userId !== undefined) {
        let room = this.serverData.getUserRoom(userId);

        if (this.serverData.getRoom(room) !== undefined) {
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
      console.log('innnnnnnnnnn');

      if (this.serverData.getRoom(payload.room) !== undefined) {
        this.serverData.getRoom(payload.room).addSpectator({
          id: client.id,
          name: this.serverData.getUser(client.handshake.query.name),
        });
        this.server.to(client.handshake.query.name).emit('fromGame', {
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
      this.server.to(payload.sender).emit('spectateRooms', {
        command: 'getRooms',
        rooms: rooms,
      });
    } else if (payload.command === 'addToQ') {
      console.log('\naaaaadddeded to  ', payload);
      this.serverData.addToQ(payload.username);
    } else if (payload.command === 'requestMatch') {
      console.log('request: ', payload);
      let enemy = this.serverData.queueTwoPlayers(payload.username);
      console.log('enemy: ', enemy);
      if (enemy !== false) {
        console.log('goooooooooooood ');
        this.server.to(payload.username).emit('fromGame', {
          command: 'QFound',
          enemy: enemy,
        });
        this.server.to(enemy).emit('fromGame', {
          command: 'QFound-start-match',
          enemy: payload.username,
        });
      }
    } else if (payload.command === 'deletefromQ') {
      this.serverData.deleteFromQ(payload.username);
    }
  }

  @SubscribeMessage('paddle')
  handlePaddle(client: Socket, payload: any): void {
    console.log('payloooaad : -> ', payload);
    if (this.serverData.getRoom(payload.room) === undefined) return;
    this.serverData
      .getRoom(payload.room)
      .setPaddle(payload.position, payload.move);
    let spect = this.serverData.getRoom(payload.room).getSpectators();
    // console.log("speeect : -> ", spect);
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
      // this.serverData.deleteUser(client.id);
    }
  }

  @SubscribeMessage('friends')
  handleFriends(client: Socket, payload: any): void {
    if (payload.command === 'checkFriend') {
      for (let i in payload.friends) {
        if (
          this.serverData.checkOnline(payload.friends[i].name) !== undefined
        ) {
          this.server.to(payload.friends[i].name).emit('friends', {
            command: 'online',
            friendName: payload.sender,
          });
          payload.friends[i].status = 1;
        }
      }
      this.serverData.setFriends(payload.sender, payload.friends);
      this.server.to(payload.sender).emit('friends', {
        command: 'updatedFriends',
        friends: payload.friends,
      });
    } else if (payload.command === 'ingame') {
      let user = this.serverData.checkOnline(payload.sender);
      if (user !== undefined) {
        let friends = user.friends;
        for (let i in friends) {
          if (this.serverData.checkOnline(friends[i].name) !== undefined) {
            this.server.to(friends[i].name).emit('friends', {
              command: 'ingame',
              friendName: payload.sender,
            });
          }
        }
      }
    } else if (payload.command === 'addFriend') {
      this.server.to(payload.friend).emit('friends', {
        command: 'receiveAdded',
        friend: client.handshake.query.name,
        status: 1,
      });
      let tmp = 0;
      if (this.serverData.checkOnline(payload.friend) !== undefined) tmp = 1;
      this.server.to(client.handshake.query.name).emit('friends', {
        command: 'receiveAdded',
        friend: payload.friend,
        status: tmp,
      });
      this.serverData.addFriend(client.handshake.query.name, payload.friend);
      this.serverData.addFriend(payload.friend, client.handshake.query.name);
    } else if (payload.command === 'removeFriend') {
      this.server.to(payload.friend).emit('friends', {
        command: 'removeFriend',
        friend: client.handshake.query.name,
      });
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    let user = this.serverData.checkOnline(client.handshake.query.name);
    if (user === undefined) {
      this.serverData.deleteUser(client.handshake.query.name);
      return;
    }
    let friends = user.friends;
    for (let i in friends) {
      if (this.serverData.checkOnline(friends[i].name) !== undefined) {
        this.server.to(friends[i].name).emit('friends', {
          command: 'offline',
          friendName: client.handshake.query.name,
        });
      }
    }
    this.serverData.deleteUser(client.handshake.query.name);
  }
  // client.handshake.query.name
  async handleConnection(client: Socket, ...args: any[]) {
    let userId = this.serverData.getKeyByValue(client.handshake.query.name);

    // check token
    let token: string = client.handshake.query.token as string
    try {
      const payload = await this.jwt.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    }
    catch {
      console.log('unvalid token')
      client.disconnect();
      return;
    }

    // console.log(payload)
    // if (typeof payload === 'object' && 'login' in payload) {
    //   console.log(payload.login)
    // return payload.login;
    // }
    // else {
    //   client.disconnect();
    // }
    // client.handshake.query.token


    client.join(client.handshake.query.name);

    console.log(
      `Client ${client.handshake.query.name} connected: ${client.id}`,
    );
    if (userId !== undefined) {
      console.log('this user already here : ');
      this.serverData.deleteUser(userId);
    }
    this.serverData.setUser(
      client.handshake.query.name,
      client.handshake.query.name,
    );
  }
}
