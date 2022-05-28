import { IsEmail, IsNotEmpty } from "class-validator";

export class usernameDto {

	@IsNotEmpty()
	username: string;

}
