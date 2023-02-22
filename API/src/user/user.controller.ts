import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
// import { map, Observable, of, retry, switchMap } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { matchDto } from './dto/match.dto';
import { UserService } from './user.service';
import { GetUser } from './decorators/user.decorator';
import { Profile } from 'passport';
import { My_guard } from './guard/guard';
import { response } from 'express';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { Stats } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { Readable } from 'stream';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { join } from 'path';
import { emailDto } from './dto/email.dto';
import { usernameDto } from './dto/username.dto';
import { tokenDto } from '../Auth/dto/token.dto';
import { twoFaDto } from './dto/enable-tfa.dto';

@UseGuards(My_guard)
@Controller('users')
export class UserController {
  constructor(
    private userservice: UserService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  //    ////////////////////
  //   ///////TWOFA////////
  //	////////////////////

  @Post('sendEmail')
  async sendEmail(@Body() emaildto: emailDto) {
    await this.userservice.sendMail(emaildto.email);
    return 'done';
  }

  @Post('enableTwoFa')
  async enableTwoFa(@Body() twofadto: twoFaDto, @GetUser() user: any) {
    return await this.userservice.enableTwoFa(twofadto, user.username);
  }

  @Post('sendVerification')
  sendVerification(@Body() emaildto: emailDto, @GetUser() user: any) {
    this.userservice.sendVerificationLink(emaildto.email, user.username);
  }

  @Get('twoFaInfo')
  TwoFaInfo(@GetUser() user: any) {
    const obj = {
      TwoFa: user.twoFaActivated,
      email: user.email,
      emailConfirmed: user.isEmailConfirmed,
    };
    return obj;
  }

  @Post('logout')
  async logout(@GetUser() user: any) {
    user.isEmailConfirmed = false;
    await this.userRepository.save(user);
  }

  // @Get('2fa')
  // async activateTwoFa(@GetUser() user: any, @Body() emaildto: emailDto) {
  // 	return await this.userservice.activateTwoFa(user.login, emaildto.email)
  // }

  //   ///////////////////////
  //  ///////USERNAME////////
  // ///////////////////////

  @Post('username') //change username
  async change_username(
    @GetUser() user: any,
    @Body() usernamedto: usernameDto,
  ) {
    if (usernamedto.username && usernamedto.username !== '')
      return await this.userservice.add_username(
        user.login,
        usernamedto.username,
      );
    return { status: 'username empty' };
  }

  @Get('username') //get username
  async get_user_name(@GetUser() user: any) {
    return {
      username: user.username,
      imagePath: user.imagePath,
      login: user.login,
    };
  }

  /////////////////////////
  /////////FRIENDS/////////
  /////////////////////////

  @Post('friends') ///add friend
  async add_friend(@GetUser() user: any, @Body() usernamedto: usernameDto) {
    return await this.userservice.add_friend(user.login, usernamedto.username);
  }

  @Get('friends') //get friends
  async get_friends(@GetUser() user: any) {
    return await this.userservice.get_friends(user.login);
  }

  @Post('block') //block user
  async block_user(@GetUser() user: any, @Body() usernamedto: usernameDto) {
    return await this.userservice.block_user(
      usernamedto.username,
      user.username,
    );
  }

  @Post('unblock') //unblock user
  async unblock_user(@GetUser() user: any, @Body() usernamedto: usernameDto) {
    return await this.userservice.unblock_user(
      usernamedto.username,
      user.username,
    );
  }

  @Post('blockedList')
  async blocked(@GetUser() user: any) {
    return await this.userservice.blocked_list(user.username);
  }

  @Post('removeFriend') //remove friend
  async removeFriend(@GetUser() user: any, @Body() usernamedto: usernameDto) {
    return await this.userservice.removeFriend(
      usernamedto.username,
      user.username,
    );
  }

  /////////////////////////
  /////////AVATAR//////////
  /////////////////////////

  @Post('avatar') //add avatar
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5242880 },
      fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(null, true);
        } else {
          cb(
            new HttpException(
              `Unsupported file type : ${file.originalname}`,
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
      storage: diskStorage({
        destination: './uploads/profileImages',
        filename: (req, file, cb) => {
          cb(null, `${file.originalname}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file, @GetUser() user: any) {
    user.imagePath = file.path;
    this.userRepository.save(user);
    return { imagePath: file.originalname };
  }

  @Get('avatar') //get avatar
  get_image(@GetUser() user: any, @Res() res) {
    res.sendFile(join(process.cwd(), user.imagePath));
  }

  @Get('avatarUser/:username') //get avatar
  async get_image_user(
    @GetUser() user: any,
    @Res() res,
    @Param() usernamedto: usernameDto,
  ) {
    const us = await this.userRepository.findOneBy({
      username: usernamedto.username,
    });
    if (us) res.sendFile(join(process.cwd(), us.imagePath));
  }
  ////////////////////
  ////GET_STATS///////
  ////////////////////

  @Post('stats')
  async get_stats(@GetUser() user: any, @Body() usernamedto: usernameDto) {
    return await this.userservice.get_stats(usernamedto.username);
  }

  ////GET history BY USERNAME

  @Post('match')
  add_to_history(@GetUser() user: any, @Body() matchdto: matchDto) {
    this.userservice.add_to_history(user.username, matchdto);
  }
}
