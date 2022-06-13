const axios = require('axios');
const dayjs = require('dayjs');
const htmlparser2 = require('htmlparser2');

const { spaceMap, timeMap } = require('./util');

function orderPlace(commitData, headers) {
  const commitUrl = 'https://webssl.xports.cn/aisports-weixin/court/commit';

  axios.post(commitUrl, commitData, { headers })
  .then(function (response) {
    if (response.status === 200 && response.data) {
      console.log('====================预定成功====================');
    }
  })
  .catch(error => {
    console.log('====================预定失败====================');
    console.log(error);
  });
}

function submit(html, palceArr, startTime, sunday, headers) {
  const palces = palceArr.map(item => spaceMap[item]);
  const times = [timeMap[startTime].startTime, timeMap[startTime + 1].startTime];
  let count = 0;

  if (!palces.length || !times.length) return;
  
  const commitData = {
    "venueId": "1101000301",
    "serviceId": "1002",
    "fieldType": "1602",
    "day": sunday,
    "fieldInfo": [],
  };
  let info = [];
  const map = {};
  const parser = new htmlparser2.Parser({
    onopentag(name, attributes) {
        if (attributes['field-segment-id'] && palces.includes(attributes['field-id']) && times.includes(attributes['start-time'])) {
          ++count;
          info.push(attributes['field-segment-id'])
          if (map[attributes['field-id']]) {
            map[attributes['field-id']].push(attributes['field-segment-id'])
          } else {
            map[attributes['field-id']] = [attributes['field-segment-id']];
          }

          if (count == 4) {
            Object.entries(map).forEach(([key, values]) => {
              commitData.fieldInfo = values.join(',');
              orderPlace(commitData, headers)
            })
          }
        }
    },
  });
  parser.write(html);
  parser.end();
}

function rushTicket(sessionID, palceArr, startTime, afterDay = 4) {
  if (palceArr.length > 2) return;
  if (startTime > 20) return;
  const sunday = dayjs(Date.now() + afterDay * 24 * 60 * 60 * 1000).format('YYYYMMDD');
  const now = Math.floor(Date.now() / 1000);
  
  const url = `https://webssl.xports.cn/aisports-weixin/court/ajax/1101000301/1002/1602/${sunday}`;
  const params = {
    fullTag: 0,
    curFieldType: 1602,
  }
  const headers = {
    'Origin': 'https://webssl.xports.cn',
    'User-Agent':	'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    'Content-Type': 'application/json',	
    'Sec-Fetch-Site':	'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Referer': url,
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cookie': `JSESSIONID=${sessionID}; Hm_lpvt_bc864c0a0574a7cabe6b36d53206fb69=${now}; Hm_lvt_bc864c0a0574a7cabe6b36d53206fb69=${now};`,
  }
  axios.get(url, { params, headers })
  .then(function (response) {
    if (response.status === 200 && response.data) {
      submit(response.data, palceArr, startTime, sunday, headers)
    }
  })
  .catch(function (error) {
    console.log(error);
  });
}

/**
 * 抢票
 * @param {String} sessionID cookie里的JSESSIONID
 * @param {Array} palceArr 场地，传入数组[1，2]，表示同时抢1号场地和2号场地，最多支持同时抢2个场地
 * @param {Number} startTime 开始时间，默认抢2个小时，传入24小时数字，如11，表示抢11:00-13:00
 * @param {Number} afterDay 抢多少天后的场次，相对今天来计算
 * @param {String} executeTime 自动执行时间，默认8点
 */
function main(sessionID, palceArr, startTime, afterDay = 4, executeTime = '08:00:00') {
  while (true) {
    const timeStr = dayjs(Date.now()).format('YYYYDDMMTHH:mm:ss');
    const reg = new RegExp(executeTime, 'g');
  
    if (reg.test(timeStr)) {
      console.log('=================开始抢票=================')
      rushTicket(sessionID, palceArr, startTime, afterDay)
      break;
    }
  }
}

main('', [1, 2], 14)

