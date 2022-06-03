import { IsNotEmpty, IsString } from "class-validator";

export class descriptionDto {
	@IsNotEmpty()
	@IsString()
	description: string
}