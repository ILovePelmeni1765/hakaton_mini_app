import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MapsService } from './maps.service';

@ApiTags('maps')
@ApiBearerAuth()
@Controller('maps')
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get('geocode')
  geocode(@Query('query') query: string) {
    return this.maps.geocode(query);
  }

  @Get('reverse')
  reverse(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.maps.reverse(lat, lng);
  }
}
