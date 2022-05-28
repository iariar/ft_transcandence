import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from 'typeorm';
import { UserEntity } from './user.entity'

@Entity()
export class UserStats {
	@PrimaryGeneratedColumn()
	id:number;

	@Column()
	wins: number;

	@Column()
	losses: number;
	
	@Column()
	ladder_level: number;

	@Column()
	achievments: number;


	// @OneToOne(() => UserEntity)
    // @JoinColumn()
	// userentity :UserEntity

}
