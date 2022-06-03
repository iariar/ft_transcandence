import { IsNotEmpty, IsString } from "class-validator";

export class chatOpDto {

	@IsString()
	@IsNotEmpty()
	username: string

	@IsString()
	@IsNotEmpty()
	description: string

}