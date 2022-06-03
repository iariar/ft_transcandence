import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class usernameDto {

	@IsNotEmpty()
	@IsString()
	username: string;

}
