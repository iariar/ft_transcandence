import { IsNotEmpty } from "class-validator";

export class matchDto {

	@IsNotEmpty()
	won: boolean;

	@IsNotEmpty()
	opponent: string;


}