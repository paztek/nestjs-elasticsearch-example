import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class AppService {

    constructor(
        private readonly client: ElasticsearchService,
    ) {}

    async getCompanies(): Promise<any[]> {
        const results = await this.client.search({ index: 'companydatabase' });
        return results.body.hits.hits.map((hit) => hit._source);
    }
}
