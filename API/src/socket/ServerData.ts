import { GameRoom } from './rooms';

export class ServerData {
  private _online: object;
  private _rooms: object;
  private _queue: any;

  constructor() {
    this._online = {};
    this._rooms = {};
    this._queue = {};
  }

  public getRoom(id: any) {
    return this._rooms[id];
  }

  public getRooms() {
    return this._rooms;
  }

  public getQ() {
    return this._queue;
  }

  addToQ(name: any, uuid: any) {
    this._queue = { ...this._queue, [name]: uuid };
  }

  randomIntFromInterval(min, max): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  queueTwoPlayers(requester) {
    let size = Object.keys(this._queue).length;
    if (
      size === 1 ||
      (this.checkOnline(requester) &&
        this.checkOnline(requester).playingRoom !== '')
    )
      return false;

    for (let e in this._queue) {
      if (e != requester && this.checkOnline(e).playingRoom === '')
        return { login: e, uuid: this._queue[e] };
    }
    return false;
  }

  deleteFromQ(name: string) {
    delete this._queue[name];
  }

  public getOnline() {
    return this._online;
  }

  public getPlayersFromRoom(room: any) {
    return this._rooms[room];
  }

  public setUser(clientId: any) {
    let tmp = {
      name: clientId,
      playingRoom: '',
      friends: [],
    };
    this._online = { ...this._online, [clientId]: tmp };
  }

  setFriends(id: any, friends: any) {
    this._online[id] = {
      ...this._online[id],
      friends: friends,
    };
  }

  addFriend(id: any, name: any, login: any, status: number) {
    if (this._online[id]) {
      let tmp = this._online[id].friends;
      tmp.push({
        name: name,
        login: login,
        status: status,
      });
      this._online[id] = {
        ...this._online[id],
        friends: tmp,
      };
    }
  }

  public getKeyByValue(value: any) {
    return Object.keys(this._online).find(
      (key) => this._online[key].name === value,
    );
  }

  public keyQueue(object: any, value: any) {
    return Object.keys(object).find((key) => object[key].uuid === value);
  }

  public getUser(id: any) {
    return this._online[id].name;
  }

  public checkOnline(id: any) {
    return this._online[id];
  }

  public getUserRoom(id: any) {
    return this._online[id].playingRoom;
  }

  public deleteUser(id) {
    delete this._online[id];
    this.deleteFromQ(id);
  }

  public createRoom(player1: any, player2: any, room: any) {
    this._online[this.getKeyByValue(player1)].playingRoom = room;
    this._online[this.getKeyByValue(player2)].playingRoom = room;
    if (
      this.getKeyByValue(player1) != undefined &&
      this.getKeyByValue(player2) != undefined
    ) {
      let p1 = {
        id: this.getKeyByValue(player1),
        name: player1,
      };
      let p2 = {
        id: this.getKeyByValue(player2),
        name: player2,
      };
      this._rooms = { ...this._rooms, [room]: new GameRoom() };
      this._rooms[room].setPlayers(p1, p2);
      this._rooms[room].setDirection();
    }
  }

  public deleteRoom(room: any) {
    delete this._rooms[room];
  }

  public invite(name: string) {
    return this.getKeyByValue(name);
  }

  public setPlayingRoom(user: any) {
    if (this._online[user] !== undefined) this._online[user].playingRoom = '';
  }

  public updateOnlineList(username: string, newUsername: string) {
    let user = this.checkOnline(username);

    if (user) {
      delete this._online[username];
      this._online = {
        ...this._online,
        [newUsername]: {
          name: newUsername,
          playingRoom: '',
          friends: user.friends,
        },
      };
    }
  }
}
