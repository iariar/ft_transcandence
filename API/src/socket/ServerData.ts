import { GameRoom } from "./rooms";

export class ServerData {
  private _online: object;
  private _rooms: object;
  private _queue: any;

  constructor() {
    this._online = {};
    this._rooms = {};
    this._queue = [];
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

  addToQ(name: string) {
    this._queue.push(name);
  }

  randomIntFromInterval(min, max): number {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  queueTwoPlayers(requester) {
    console.log("requested id in queue ======>  ", this._queue);
    if (this._queue.length === 1)
      return false;
    let requesterInd = this._queue.indexOf(requester);
    if (requesterInd === -1)
      return false;

    let tmp = this._queue.slice(0);
    tmp.splice(requesterInd, 1);
    let random: number = this.randomIntFromInterval(0, tmp.length - 1);
    console.log("random: ", ~~random, "list: ", tmp, " list l: ", tmp.length);
    return tmp[~~random];
  }

  deleteFromQ(name: string) {
    const index = this._queue.indexOf(name);
    if (index > -1) {
      this._queue.splice(index, 1);
    }
  }

  public getOnline() {
    return this._online;
  }

  public getPlayersFromRoom(room: any) {
    return this._rooms[room];
  }

  public setUser(client, clientId: any) {
    console.log(client, clientId);
    let tmp = {
      name: client,
      playingRoom: "",
      friends: []
    }
    this._online = { ...this._online, [clientId]: tmp };
    console.log("--> ", this._online);

  }

  setFriends(id: any, friends: any) {
    this._online[id] = {
      ...this._online[id],
      friends: friends
    }
  }

  addFriend(id: any, name: any) {
    let tmp = this._online[id].friends;
    tmp.push({
      name: name,
      status: 1
    });
    this._online[id] = {
      ...this._online[id],
      friends: tmp
    }
  }

  public getKeyByValue(value: any) {
    return Object.keys(this._online).find(key => this._online[key].name === value);
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
    console.log("after delete ", this._online);
  }

  public createRoom(player1: any, player2: any, room: any) {
    this._online[this.getKeyByValue(player1)].playingRoom = room;
    this._online[this.getKeyByValue(player2)].playingRoom = room;
    if (this.getKeyByValue(player1) != undefined && this.getKeyByValue(player2) != undefined) {
      let p1 = {
        id: this.getKeyByValue(player1),
        name: player1
      }
      let p2 = {
        id: this.getKeyByValue(player2),
        name: player2
      }
      // console.log(p1, p2)
      this._rooms = { ...this._rooms, [room]: new GameRoom() }
      this._rooms[room].setPlayers(p1, p2);
      this._rooms[room].setDirection();
    }
    console.log(this._rooms);
  }

  public deleteRoom(room: any) {
    for (let e in this._rooms[room].getPlayers()) {
      this._online[e].playingRoom = "";
    }
    delete this._rooms[room];
  }

  public invite(name: string) {
    return this.getKeyByValue(name);
  }
}