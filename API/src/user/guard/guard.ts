import { AuthGuard } from "@nestjs/passport";

export class My_guard extends AuthGuard('jwt'){
	constructor(){
		super();
	}
}