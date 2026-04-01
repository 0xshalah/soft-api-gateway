import { Controller, Get, Post, Body, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { KeysService } from './keys.service';
import { CreateKeyDto } from './dto/create-key.dto';

@Controller('api/keys')
@UsePipes(new ValidationPipe({ transform: true }))
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post()
  create(@Body() createKeyDto: CreateKeyDto) {
    return this.keysService.create(createKeyDto);
  }

  @Get()
  findAll() {
    return this.keysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.keysService.findOne(id);
  }

  @Delete(':id')
  revoke(@Param('id') id: string) {
    return this.keysService.revoke(id);
  }
}
