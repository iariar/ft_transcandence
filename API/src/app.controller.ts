import { Body, Controller, Get, Param, ParseIntPipe, Post, Render, Res, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { Response } from 'express';

@Controller()
export class appController {
	constructor(
		private userservice: UserService
	) { }
	@Get('/:id')
	async getDatabaseFilebyId(@Res({ passthrough: true }) response: Response, @Param('id', ParseIntPipe) id: number) {

		// console.log('here');
		// const ret = await this.userservice.check_if_token_valid(token)
		// if (ret.stats === true)
		// {
		const file = await this.userservice.getFileById(id)
		const stream = Readable.from(file.data)
		response.set({
			'Content-Disposition': `inline; filename="${file.filename}"`,
			'Content-Type': 'image'
		})
		return new StreamableFile(stream);
		// console.log(response)
		// }
		// return ({status:'no'});
	}
}
// 	constructor(private appservice: AppService){}
// 	@Get()
// 	@Render('index')
// 	root() { }

// 	@Get('verify')
// 	@Render('verify')
// 	VerifyEmail() { }

// 	@Post('signup')
// 	async Signup(@Body() user: TfaUser) {
// 		return await this.appservice.signup(user);
// 	}
// 	@Post('signin')
// 	async Signin(@Body() user: TfaUser) {
// 	return await this.appservice.signin(user);
// 	}
// 	@Post('verify')
// 	async Verify(@Body() body) {
// 	return await this.appservice.verifyAccount(body.code)
//  }
// }