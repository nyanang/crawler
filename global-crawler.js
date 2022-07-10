const _ =require('lodash'); // 다양한 유틸리티 함수 제공
const axios =require('axios'); // HTTP 클라이언트 모듈
const cheerio = require('cheerio'); // HTML 파싱 및 DOM 생성

// 6장에서 구글 시트에서 내려받은 countryInfo 데이터 사용
const countryInfo = require('../coronaboard/tools/downloaded/countryInfo.json')

class GlobalCrawler {
    constructor() {
        this.client = axios.create({
            // 실제 크롬 웹브라우저에서 보내는 값과 동일하게 넣기
            headers: {
                'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
            },
        });

        // countryInfo로부터 '월드오미터의 국가 이름' -> '국가 코드' 매핑 생성
        this.countryMapping = _.chain(countryInfo)
            .keyBy('worldometer_title')
            .mapValues('cc')
            .value();
    }

    // 크롤링 수행
    async crawlStat() {
        // 클론 사이트 주소
        const url = 'https://yjiq150.github.io/coronaboard-crawling-sample/clone/worldometer/';
       
        const resp = await this.client.get(url);
        const $ = cheerio.load(resp.data);

        return this._extractStatByCountry($);
    }

    _extractStatByCountry($) {
        // 테이블 컬럼 이름 추출
        const colNames = $('#main_table_countries_today thead tr th')
            .map((i, th) => {
                return $(th).text().trim();
            })
            .toArray();

        //테이블의 모든 행 추출
        const rows = [];
        $('#main_table_countries_today tbody tr').each((i, tr) => {
            const row = $(tr)
                .find('td')
                .map((j,td) =>{
                    return $(td).text().trim();
                })
                .toArray();
            rows.push(row);
        });

        if (rows.length === 0) {
            throw new Error(
                'Country rows not found. Site layout may have been changed.',
            );
        }

        //월드오미터의 컬럼 이름을 API에서 사용하는 필드 이름으로 매핑
        const colNameToFieldMapping = {
            'Country,Other' : 'title',
            TotalCases: ' confirmed',
            TotalDeaths: 'death',
            TotalRecovered: 'released',
            TotalTests: 'tested',
        };

        // 코로나보드 API에 맞는 형태로 데이터 변환
        const normalizedData = rows
            .map((row) => { 
                const countryStat = {};
                for (let i =0; i < colNames.length; i++){
                    const colName = colNames[i];
                    const fieldName = colNameToFieldMapping[colName];
                    //컬럼 이름에 대한 필드 매핑이 정해지지 않은 경우 무시

                    if(!fieldName) {
                        continue;
                    }
                    const numberFields=['confirmed', 'death', 'released', 'tested'];

                    if (numberFields.includes(fieldName)) {
                        countryStat[fieldName] = this._normalize(row[i]);
                    } else {
                        countryStat[fieldName] = row[i];
                    }
                }
                return countryStat;
            })
            .filter((countryStat) => this.countryMapping[countryStat.title])
            .map((countryStat) => ({
                ...countryStat,
                cc: this.countryMapping[countryStat.title],
            }));

            return _.keyBy(normalizedData, 'cc');
    }
   
    // 텍스트로 된 숫자를 실제 수치로 변환
    _normalize(numberText) {
        //아래 형태로 들어올 때 괄호 없는 앞쪽 숫자만 추출
        // // ex) 8,757(45.14)
        // const matches = /[0-9,]+/.exec(numberText);
        // const absValue = matches[0];
        return parseInt(numberText.replace(/[\s,]*/g, '')) || 0; 
    }
}

module.exports = GlobalCrawler;