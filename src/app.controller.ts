import { Controller, Get, InternalServerErrorException } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {

    constructor(
        private readonly appService: AppService,
    ) {}

    @Get('/companies')
    getCompanies(): Promise<any[]> {
        try {
            return this.appService.getCompanies();
        } catch (e) {
            throw new InternalServerErrorException(e);
        }
    }
}
