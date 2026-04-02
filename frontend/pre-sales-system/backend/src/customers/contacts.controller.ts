import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';

@Controller('customers/:customerId/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Param('customerId') customerId: string, @Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(customerId, createContactDto);
  }

  @Get()
  findAll(@Param('customerId') customerId: string) {
    return this.contactsService.findAll(customerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.update(id, updateContactDto);
  }

  @Patch(':id/set-primary')
  setPrimary(@Param('id') id: string) {
    return this.contactsService.setPrimary(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
