import { IsNotEmpty, IsString } from "class-validator";

export class pushMsgDto {

	@IsString()
	@IsNotEmpty()
	content: string;

	@IsString()
	@IsNotEmpty()
	sender: string;

	@IsString()
	@IsNotEmpty()
	description: string

}