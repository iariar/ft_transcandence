import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/user/decorators';
import { codeDto } from 'src/Auth/dto/code.dto';
import { tokenDto } from 'src/Auth/dto/token.dto';
import { UserI } from 'src/user/dto/user.interface';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { userTokenI } from './interface/token.interface'

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService,
		private userservice: UserService
	) { }

	@Post('token')
	async signup(@Body() codedto: codeDto) {
		let ret: { stats: boolean; login: string, twoFa: boolean }
		let token_username_email: { access_token: string; username: string, email: string }
		ret = await this.userservice.get_tk_li(codedto.code)
		console.log(ret)
		if (ret.login) {
			token_username_email = await this.authService.signToken(ret.login)
			console.log(ret);

			if (ret.twoFa && token_username_email.email !== "") {
				this.userservice.sendVerificationLink(token_username_email.email, token_username_email.username);
			}
			return ({ access_token: token_username_email.access_token, username: token_username_email.username, twoFa: ret.twoFa })
		}
		return ({})
	}

	@Post('confirm')
	async confirm(@Body() tokendto: tokenDto) {
		const username = await this.userservice.decodeConfirmationToken(tokendto.token);
		return await this.userservice.confirmEmail(username);
	}

}
