import { IsEmail, IsNotEmpty } from "class-validator";


export class LoginUserDto {


	@IsEmail()
	@IsNotEmpty()
	login: string;

	@IsNotEmpty()
	username: string;

}
