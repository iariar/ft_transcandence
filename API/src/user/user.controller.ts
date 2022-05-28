import { Body, Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { map, Observable, of, retry, switchMap } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UserI } from './dto/user.interface';
import { UserHelperService } from './user-helper/user-helper.service';
import { UserService } from './user.service';
import { GetUser } from './decorators/user.decorator'
import { Profile } from 'passport';
import { My_guard } from './guard/guard';
import { response } from 'express';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios'
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

@UseGuards(My_guard)
@Controller('users')
export class UserController {
	constructor(private userservice: UserService, private userHelper: UserHelperService,
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,) { }

	//////////////////////
	/////////TWOFA////////
	//////////////////////

	@Get('sendEmail')
	async sendEmail(@Body('email') email: string) {
		await this.userservice.sendMail(email);
		// console.log(email)
		return 'done'
	}

	@Post('enableTwoFa')
	async enableTwoFa(@Body() emaildto: emailDto, @GetUser() user: any) {
		return await this.userservice.enableTwoFa(emaildto.email, user.username);
	}

	@Post('disableTwoFa')
	disableTwoFa(@Body('email') email: string, @GetUser() user: any) {
		return this.userservice.disableTwoFa(user.username);
	}

	@Post('sendVerification')
	sendVerification(@Body('email') email: string, @GetUser() user: any) {
		this.userservice.sendVerificationLink(email, user.username);
	}

	@Post('confirm')
	async confirm(@Body('token') token: string, @GetUser() user: any) {
		const email = await this.userservice.decodeConfirmationToken(token);
		return await this.userservice.confirmEmail(email);
	}

	@Get('2fa')
	async activateTwoFa(@GetUser() user: any, @Body('email') email: string) {
		return await this.userservice.activateTwoFa(user.login, email)
	}

	/////////////////////////
	/////////USERNAME////////
	/////////////////////////

	@Post('username') //change username
	async change_username(@GetUser() user: any, @Body() usernamedto: usernameDto) {
		// console.log('|', usernamedto.username, "|")
		if (usernamedto.username && usernamedto.username !== "")
			return await this.userservice.add_username(user.login, usernamedto.username)
		return ({ status: 'username empty' })
	}


	@Get('username')//get username
	async get_user_name(@GetUser() user: any) {
		console.log(user)
		// if (user.username) {
		// console.log(user)
		return { username: user.username }
		// }
		// else
		// 	return { username: undefined }
	}

	/////////////////////////
	/////////FRIENDS/////////
	/////////////////////////

	@Post('friends')///add friend
	async add_friend(@GetUser() user: any, @Body('username') username: string) {
		return await this.userservice.add_friend(user.login, username)
	}

	@Get('friends')//get friends
	async get_friends(@GetUser() user: any) {
		return await this.userservice.get_friends(user.login)
	}
	/////////////////////////
	/////////AVATAR//////////
	/////////////////////////

	@Post('avatar')	//add avatar
	@UseInterceptors(FileInterceptor('file', {
		storage: diskStorage({
			destination: './uploads/profileImages',
			filename: (req, file, cb) => {
				cb(null, `${file.originalname}`)
			}
		})
	}))
	async uploadFile(@UploadedFile() file, @GetUser() user: any) {
		// console.log('heeeeereeeee')
		user.imagePath = file.path;
		this.userRepository.save(user);
		return of({ imagePath: file.path })
	}

	@Get('avatar')	//get avatar
	get_image(@GetUser() user: any, @Res() res) {
		return of(res.sendFile(join(process.cwd(), user.imagePath)))
	}

	@Get('all')
	async findAll(@Param('token') token: string) {
		return this.userservice.get_all_users()
	}

	@Post('delete')
	delete() {
		this.userservice.delete_all()
	}

	////////////////////
	////GET_STATS///////
	////////////////////

	@Get('stats')
	async get_stats(@GetUser() user: any) {
		return await this.userservice.get_stats(user.login)
	}


	////GET USER BY USERNAME
	@Get(':username')
	async get_user_by_username(@GetUser() user: any, @Param('username') username: string) {
		return await this.userservice.get_user_by_username(username)
	}
}