const axios = require('axios');

class ApiClient {
    constructor() {

        // HTTP 클라이언트
        const client = axios.create({
            baseURL: process.env.CB_API_BASE_URL || 'http://localhost:8080',
        });

        // 응답에 대한. 인터셉터를 등록하면 모든 응답에 대해 여기 등록된 함수 수행
        // (매번 응답 객체의 data 필드에 접근하는 것이 번거롭다면 아래 코드를 통해
        // 응답 객체 대신 실제 응답 바디에 해당하는 객체를 바로 반환)

        client.interceptors.response.use((resp) => {
            return resp.data;
        });

        this.client = client;
    }

    // 국가별 통계를 Upsert (Update 또는 innset)하는 global-stats API 호출
    async upsertGlobalStat(data){
        return await this.client.post('global-stats', data);
    }

    // 키-값 쌍을 Upsert하는 key-value API 호출
    async upsertKeyValue(key, value) {
        return await this.client.post('key-value', {
            key,
            value,
        });
    }
}

module.exports = ApiClient;