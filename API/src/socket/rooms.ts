
export class GameRoom {
  private _players: object;
  private _spectators: object;
  private _ballDirection: { x: number, y: number };
  private _playStatus: {
    player0: boolean,
    player1: boolean
  }
  private _score: {
    postion0: number,
    postion1: number
  }
  private _paddle: {
    paddle0: number,
    paddle1: number
  }

  constructor() {
    this._spectators = {};
    this._players = {};
    this._playStatus = {
      player0: true,
      player1: true
    }
    this._ballDirection = {
      x: 0,
      y: 0
    };
    this._score = {
      postion0: 0,
      postion1: 0
    };
    this._paddle = {
      paddle0: 50,
      paddle1: 50
    }
  }

  getDirection() {
    return this._ballDirection;
  }

  getScore() {
    return this._score;
  }

  getPaddle() {
    return this._paddle;
  }

  getPlayers() {
    return this._players;
  }

  getSpectators() {
    return this._spectators;
  }

  getPlayerStatus() {
    return this._playStatus;
  }

  setPlayers(player1: any, player2: any) {
    this._players = { ...this._players, [player1.id]: player1.name };
    this._players = { ...this._players, [player2.id]: player2.name };
  }

  setScore(id: number) {
    if (id === 0)
      this._score.postion0 += 1;
    else
      this._score.postion1 += 1;
  }

  setPaddle(id: number, value: number) {
    if (id === 0)
      this._paddle.paddle0 = value;
    else
      this._paddle.paddle1 = value;
  }

  setPlayersStatus(position: number) {
    if (position === 0)
      this._playStatus.player0 = false;
    else if (position === 1)
      this._playStatus.player1 = false;
  }

  addSpectator(spectator: any) {
    this._spectators = { ...this._spectators, [spectator.id]: spectator.name };
  }

  removeSpectator(id: any) {
    if (this._spectators[id] !== undefined)
      delete this._spectators[id];
  }

  randomNumberBetween(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  setDirection() {
    this._ballDirection = {
      x: 0,
      y: 0
    };
    while (
      Math.abs(this._ballDirection.x) <= 0.2 ||
      Math.abs(this._ballDirection.x) >= 0.9
    ) {
      const heading = this.randomNumberBetween(0, 2 * Math.PI)
      this._ballDirection = { x: Math.cos(heading), y: Math.sin(heading) }
    }
  }

  updateDirection(direct: any) {
    this._ballDirection = direct;
  }
}