import { IsString, IsOptional, IsEmail, MaxLength, IsNotEmpty } from 'class-validator';
export class CreateBookingDto {
  @IsNotEmpty() @IsString() slot_id: string;
  @IsOptional() @IsString() @MaxLength(100) client_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() event_type_id?: string;
  @IsOptional() @IsString() idempotency_key?: string;
}
