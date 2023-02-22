import { Body, Controller, Post, UseGuards, Get } from '@nestjs/common';
import { My_guard } from 'src/guard';
import { GetUser } from 'src/user/decorators';
import { descriptionDto } from 'src/chat/dto/description.dto';
import { passwordVerificationDto } from 'src/chat/dto/password_verification.dto';
import { pushMsgDto } from 'src/chat/dto/push_msg.dto';
import { chatOpDto } from 'src/chat/dto/chat_op.dto';
import { roomCreationDto } from 'src/chat/dto/room_creation.dto';
import { usernameDto } from 'src/user/dto/username.dto';
import { ChatService } from './chat.service';
import { setAdminDto } from './dto/set_admin.dto';

@UseGuards(My_guard)
@Controller('chat')
export class ChatController {
  constructor(private chatservice: ChatService) {}
  @Post('createRoom')
  async createRoom(
    @Body() roomcreationdto: roomCreationDto,
    @GetUser() user: any,
  ) {
    try {
      return await this.chatservice.createRoom(roomcreationdto, user.username);
    } catch (err) {
      console.log('createRoom');
    }
  }

  @Post('hasPass')
  async has_pass(@Body() descriptiondto: descriptionDto) {
    return await this.chatservice.room_has_password(descriptiondto.description);
  }

  @Post('verify_password')
  async verify_password(
    @Body() passwordverificationdto: passwordVerificationDto,
  ) {
    return await this.chatservice.verify_password(passwordverificationdto);
  }

  @Post('joinRoom')
  async joinRoom(@Body() descriptiondto: descriptionDto, @GetUser() user: any) {
    return await this.chatservice.joinRoom(
      user.username,
      descriptiondto.description,
    );
  }

  @Post('leaveRoom')
  async leaveRoom(
    @Body() descriptiondto: descriptionDto,
    @GetUser() user: any,
  ) {
    return await this.chatservice.leaveRoom(
      user.username,
      descriptiondto.description,
    );
  }

  @Post('pushMsg')
  async pushMsg(@Body() pushmsgdto: pushMsgDto) {
    return await this.chatservice.pushMsg(pushmsgdto);
  }

  @Post('isPrivate')
  async isPrivate(@Body() descriptiondto: descriptionDto) {
    return await this.chatservice.isPrivate(descriptiondto.description);
  }

  @Post('my_rooms')
  async get_room_descriptions(@GetUser() user: any) {
    return await this.chatservice.get_user_rooms(user.username);
  }

  @Post('roomUsers')
  async roomUsers(@Body() descriptiondto: descriptionDto) {
    return await this.chatservice.roomUsers(descriptiondto);
  }

  @Post('roomMsgs')
  async roomMsgs(@GetUser() user: any, @Body() descriptiondto: descriptionDto) {
    return await this.chatservice.get_room_messages(
      descriptiondto.description,
      user.login,
    );
  }

  @Get('descriptions')
  async get_descriptions() {
    return await this.chatservice.get_room_descriptions();
  }

  @Get('descriptions/private')
  async get_descriptions_private() {
    return await this.chatservice.get_room_descriptions_private();
  }

  @Post('createDm')
  create_dm(@GetUser() user: any, @Body() usernamedto: usernameDto) {
    return this.chatservice.createDm(user.username, usernamedto.username);
  }

  @Post('findDm')
  findDm(@GetUser() user: any, @Body() usernamedto: usernameDto) {
    return this.chatservice.find_dm(user.login, usernamedto.username);
  }

  @Post('pushDm')
  pushDm(@GetUser() user: any, @Body() pushMsgdto: pushMsgDto) {
    return this.chatservice.pushDm(pushMsgdto, user.username);
  }

  @Post('ad_ow')
  chech_if_admin_or_owner(
    @GetUser() user: any,
    @Body() descriptiondto: descriptionDto,
  ) {
    return this.chatservice.check_if_admin_or_owner(
      descriptiondto.description,
      user.username,
    );
  }

  @Post('ban')
  bann(@GetUser() user: any, @Body() chatopdto: chatOpDto) {
    return this.chatservice.bann_user(
      chatopdto.description,
      chatopdto.username,
    );
  }

  @Post('mute')
  mute(@GetUser() user: any, @Body() chatopdto: chatOpDto) {
    return this.chatservice.mute_user(
      chatopdto.description,
      chatopdto.username,
    );
  }

  @Post('kick')
  kick(@GetUser() user: any, @Body() chatopdto: chatOpDto) {
    return this.chatservice.kick_user(
      chatopdto.username,
      chatopdto.description,
    );
  }

  @Post('setPass')
  set_pass(
    @GetUser() user: any,
    @Body() descriptiondto: passwordVerificationDto,
  ) {
    return this.chatservice.set_new_password(
      descriptiondto.description,
      descriptiondto.password,
    );
  }

  @Post('addAdmin')
  add_administrator(@GetUser() user: any, @Body() setadmindto: setAdminDto) {
    return this.chatservice.add_administrator(
      setadmindto.description,
      setadmindto.username,
      setadmindto.set,
    );
  }
}
