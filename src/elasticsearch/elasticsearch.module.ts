import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ElasticsearchModule as BaseElasticsearchModule, ElasticsearchService } from '@nestjs/elasticsearch';
import { v4 as uuid }from 'uuid';

@Module({
    imports: [
        BaseElasticsearchModule.register({
            node: 'http://localhost:9200',
            generateRequestId: () => uuid(),
        }),
    ],
    exports: [
        BaseElasticsearchModule,
    ],
})
export class ElasticsearchModule implements OnModuleInit {

    constructor(
        private readonly client: ElasticsearchService,
    ) {}

    public onModuleInit(): any {
        interface CorrelationInfos {
            startTime: Date;
        }

        const correlationsMap = new Map<string, CorrelationInfos>();

        const logger = new Logger('Elasticsearch');

        this.client.on('request', (err, result) => {
            const { id } = result.meta.request;

            /**
             * We could have skipped the use of a correlations map by adding the start time to the request metadata
             * but we don't know what Elasticsearch does with the meta.request inside the lib so this is safer.
             */
            correlationsMap.set(id, { startTime: new Date() });
        });

        this.client.on('response', (err, result) => {
            const { statusCode, meta: { request: { id }, attempts }, body } = result;

            // Retrieve the correlation infos
            const correlationInfos = correlationsMap.get(id);

            // We don't want these correlation infos to accumulate
            correlationsMap.delete(id);

            if (!correlationInfos) {
                logger.error(`Response has an unknown correlation ID`); // It should not happen
                return;
            }

            const now = new Date();
            const duration = now.getTime() - correlationInfos.startTime.getTime();

            // Build the log message
            let message = `${duration}ms`;
            if (statusCode) {
                // statusCode is null when ES is down
                message = `${statusCode} - ${message}`;
            }
            if (attempts > 1) {
                // Log the # of attempts only when relevant
                message = `${message} - ${attempts} attemps`;
            }
            let logFn = logger.log.bind(logger);
            if (body && body.headers) {
                // No body nor headers when ES is down (and probably in case of some other serious errors)
                message = `${message} - content-length: ${body.headers['content-length']}`
            }
            if (err) {
                message = `${message} - ${err.stack}`;
                logFn = logger.error.bind(logger);
            }

            logFn(message);
        });
    }
}
