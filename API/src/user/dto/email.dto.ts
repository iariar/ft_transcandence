import { IsEmail, IsNotEmpty } from "class-validator";

export class emailDto {

	@IsEmail()
	@IsNotEmpty()
	email: string;

}
