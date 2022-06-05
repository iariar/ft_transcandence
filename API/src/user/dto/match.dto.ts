import { IsNotEmpty } from "class-validator";

export class matchDto {

	@IsNotEmpty()
	won: boolean;

	@IsNotEmpty()
	oppenent: string;


}