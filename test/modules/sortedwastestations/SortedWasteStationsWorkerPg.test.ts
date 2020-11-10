"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";

import { DataSourceStream } from "../../../src/core/datasources/DataSourceStream";
import { SortedWasteStationsWorkerPg } from "../../../src/modules/sortedwastestations";

describe("SortedWasteStationsWorkerPg", () => {

    let worker;
    let sandbox;

    // tslint:disable
    const ksnkoStationsData = [
      {
        "id": 115,
        "number": "2021/ 011",
        "name": "Lochenická 538",
        "access": "volně",
        "location": "outdoor",
        "cityDistrict": {
          "id": 51,
          "name": "Klánovice",
          "ruianCode": "538302"
        },
        "coordinate": {
          "lat": -725122.182606,
          "lon": -1044775.35985
        },
        "containers": [
          {
            "id": 623,
            "code": "S2021011TPV1100HV623",
            "sensorId": null,
            "trashType": {
              "code": "p",
              "name": "Papír"
            },
            "container": {
              "name": "1100 L normální - HV",
              "volume": 1100,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "13"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 624,
            "code": "S2021011TPV1100HV624",
            "sensorId": null,
            "trashType": {
              "code": "p",
              "name": "Papír"
            },
            "container": {
              "name": "1100 L normální - HV",
              "volume": 1100,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "13"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 626,
            "code": "S2021011TUV1100HV626",
            "sensorId": null,
            "trashType": {
              "code": "u",
              "name": "Plast"
            },
            "container": {
              "name": "1100 L normální - HV",
              "volume": 1100,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "14"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 622,
            "code": "S2021011TNKV240HV622",
            "sensorId": null,
            "trashType": {
              "code": "nk",
              "name": "Nápojové kartóny"
            },
            "container": {
              "name": "240 L normální - HV",
              "volume": 240,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "11"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 625,
            "code": "S2021011TSBV3350SV625",
            "sensorId": null,
            "trashType": {
              "code": "sb",
              "name": "Barevné sklo"
            },
            "container": {
              "name": "3350 L Atomium Reflex - SV",
              "volume": 3350,
              "brand": "Atomium Reflex",
              "dump": "SV"
            },
            "cleaningFrequency": {
              "code": "41"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 621,
            "code": "S2021011TSCV3350SV621",
            "sensorId": null,
            "trashType": {
              "code": "sc",
              "name": "Čiré sklo"
            },
            "container": {
              "name": "3350 L Atomium Reflex - SV",
              "volume": 3350,
              "brand": "Atomium Reflex",
              "dump": "SV"
            },
            "cleaningFrequency": {
              "code": "41"
            },
            "currentPercentFullness": 0
          }
        ]
      },
      {
        "id": 116,
        "number": "2021/ 012",
        "name": "Medinská 495",
        "access": "volně",
        "location": "outdoor",
        "cityDistrict": {
          "id": 51,
          "name": "Klánovice",
          "ruianCode": "538302"
        },
        "coordinate": {
          "lat": -725222.558281,
          "lon": -1045099.2586
        },
        "containers": [
          {
            "id": 629,
            "code": "S2021012TPV1100HV629",
            "sensorId": null,
            "trashType": {
              "code": "p",
              "name": "Papír"
            },
            "container": {
              "name": "1100 L normální - HV",
              "volume": 1100,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "13"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 631,
            "code": "S2021012TUV1100HV631",
            "sensorId": null,
            "trashType": {
              "code": "u",
              "name": "Plast"
            },
            "container": {
              "name": "1100 L normální - HV",
              "volume": 1100,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "14"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 628,
            "code": "S2021012TNKV240HV628",
            "sensorId": null,
            "trashType": {
              "code": "nk",
              "name": "Nápojové kartóny"
            },
            "container": {
              "name": "240 L normální - HV",
              "volume": 240,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "11"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 630,
            "code": "S2021012TSBV3350SV630",
            "sensorId": null,
            "trashType": {
              "code": "sb",
              "name": "Barevné sklo"
            },
            "container": {
              "name": "3350 L Atomium Reflex - SV",
              "volume": 3350,
              "brand": "Atomium Reflex",
              "dump": "SV"
            },
            "cleaningFrequency": {
              "code": "41"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 627,
            "code": "S2021012TSCV3350SV627",
            "sensorId": null,
            "trashType": {
              "code": "sc",
              "name": "Čiré sklo"
            },
            "container": {
              "name": "3350 L Atomium Reflex - SV",
              "volume": 3350,
              "brand": "Atomium Reflex",
              "dump": "SV"
            },
            "cleaningFrequency": {
              "code": "41"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 21995,
            "code": "S2021012TKOV1100SV21995",
            "sensorId": null,
            "trashType": {
              "code": "ko",
              "name": "Kovy"
            },
            "container": {
              "name": "1100 L mini H - SV",
              "volume": 1100,
              "brand": "mini H",
              "dump": "SV"
            },
            "cleaningFrequency": {
              "code": "41"
            },
            "currentPercentFullness": 0
          }
        ]
      },
      {
        "id": 117,
        "number": "2021/ 013",
        "name": "V soudním 774",
        "access": "volně",
        "location": "outdoor",
        "cityDistrict": {
          "id": 51,
          "name": "Klánovice",
          "ruianCode": "538302"
        },
        "coordinate": {
          "lat": -724994.874996,
          "lon": -1044589.84962
        },
        "containers": [
          {
            "id": 634,
            "code": "S2021013TPV1100HV634",
            "sensorId": null,
            "trashType": {
              "code": "p",
              "name": "Papír"
            },
            "container": {
              "name": "1100 L normální - HV",
              "volume": 1100,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "14"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 636,
            "code": "S2021013TUV1100HV636",
            "sensorId": null,
            "trashType": {
              "code": "u",
              "name": "Plast"
            },
            "container": {
              "name": "1100 L normální - HV",
              "volume": 1100,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "14"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 633,
            "code": "S2021013TNKV240HV633",
            "sensorId": null,
            "trashType": {
              "code": "nk",
              "name": "Nápojové kartóny"
            },
            "container": {
              "name": "240 L normální - HV",
              "volume": 240,
              "brand": "normální",
              "dump": "HV"
            },
            "cleaningFrequency": {
              "code": "11"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 635,
            "code": "S2021013TSBV3350SV635",
            "sensorId": null,
            "trashType": {
              "code": "sb",
              "name": "Barevné sklo"
            },
            "container": {
              "name": "3350 L Atomium Reflex - SV",
              "volume": 3350,
              "brand": "Atomium Reflex",
              "dump": "SV"
            },
            "cleaningFrequency": {
              "code": "41"
            },
            "currentPercentFullness": 0
          },
          {
            "id": 632,
            "code": "S2021013TSCV3350SV632",
            "sensorId": null,
            "trashType": {
              "code": "sc",
              "name": "Čiré sklo"
            },
            "container": {
              "name": "3350 L Atomium Reflex - SV",
              "volume": 3350,
              "brand": "Atomium Reflex",
              "dump": "SV"
            },
            "cleaningFrequency": {
              "code": "41"
            },
            "currentPercentFullness": 0
          }
        ]
      },
    ]

    const sensorContainersData = [
        {
            "id": 30407,
            "code": "0001/-147C01602",
            "latitude": 50.089747374256866,
            "longitude": 14.420333728221522,
            "address": "Široká 1083/24",
            "district": "",
            "postal_code": "11000",
            "total_volume": 2000,
            "trash_type": "paper",
            "prediction": "2020-07-23T23:17:53.000Z",
            "bin_type": "Semi-underground",
            "installed_at": "2019-01-28T00:00:00.000Z",
            "network": "Lora"
          },
          {
            "id": 30408,
            "code": "0001/-147C01603",
            "latitude": 50.089747374256866,
            "longitude": 14.420333728221522,
            "address": "Široká 1083/24",
            "district": "",
            "postal_code": "11000",
            "total_volume": 1100,
            "trash_type": "metal",
            "prediction": "2020-08-16T17:44:42.000Z",
            "bin_type": "Semi-underground",
            "installed_at": "2019-01-28T00:00:00.000Z",
            "network": "Lora"
          },
          {
            "id": 30409,
            "code": "0001/-144C01604",
            "latitude": 50.089747374256866,
            "longitude": 14.420333728221522,
            "address": "Široká 1083/24",
            "district": "",
            "postal_code": "11000",
            "total_volume": 1100,
            "trash_type": "beverage_cartons",
            "prediction": "2020-08-01T21:26:55.000Z",
            "bin_type": "Semi-underground",
            "installed_at": "2019-01-28T00:00:00.000Z",
            "network": "SIGFOX"
          },
          {
            "id": 29910,
            "code": "0001/-144C00403",
            "latitude": 50.10692990636685,
            "longitude": 14.443819150355925,
            "address": "Ortenovo náměstí 890/2",
            "district": "",
            "postal_code": "17000",
            "total_volume": 3000,
            "trash_type": "paper",
            "prediction": null,
            "bin_type": "Schäfer/Europa-OV",
            "installed_at": "2018-12-18T00:00:00.000Z",
            "network": "SIGFOX"
          },
          {
            "id": 29911,
            "code": "0001/-134C00404",
            "latitude": 50.10692990636685,
            "longitude": 14.443819150355925,
            "address": "Ortenovo náměstí 890/2",
            "district": "",
            "postal_code": "17000",
            "total_volume": 3000,
            "trash_type": "plastic",
            "prediction": "2020-07-22T10:41:05.000Z",
            "bin_type": "Schäfer/Europa-OV",
            "installed_at": "2018-12-18T00:00:00.000Z",
            "network": "SIGFOX"
          }
    ]

    const oictContainersData = [
        {
            "slug": "u-modre-skoly",
            "description": "u komunitního centra Matky Terezy",
            "company": {
              "phone": "224 316 800, 491 524 342",
              "email": "diakonie@diakoniebroumov.org",
              "web": "http://www.diakoniebroumov.org",
              "name": "Diakonie Broumov"
            },
            "coordinates": [
                14.427678950000075,
                50.08859091000003
            ],
            "address": "U Modré školy",
            "unique_id": "diakonie-broumov_u-modre-skoly",
            "district": "praha-11",
            "cleaning_frequency": "0",
            "accessibility": "volně",
            "trash_type": "Textil"
          },
          {
            "slug": "zahradnickova",
            "description": "u stanoviště separace",
            "company": {
              "phone": "224 316 800, 491 524 342",
              "email": "diakonie@diakoniebroumov.org",
              "web": "http://www.diakoniebroumov.org",
              "name": "Diakonie Broumov"
            },
            "coordinates": [
                14.427678950000075,
                50.08859091000003
            ],
            "address": "Zahradníčkova",
            "unique_id": "diakonie-broumov_zahradnickova",
            "district": "praha-5",
            "cleaning_frequency": "0",
            "accessibility": "volně",
            "trash_type": "Textil"
          },
          {
            "slug": "vyrobni",
            "description": "v areálu městského úřadu",
            "company": {
              "phone": "224 316 800, 491 524 342",
              "email": "diakonie@diakoniebroumov.org",
              "web": "http://www.diakoniebroumov.org",
              "name": "Diakonie Broumov"
            },
            "coordinates": [
                14.42829514200007,
                50.07942290200008
            ],
            "address": "Výrobní",
            "unique_id": "diakonie-broumov_vyrobni",
            "district": "praha-sterboholy",
            "cleaning_frequency": "0",
            "accessibility": "volně",
            "trash_type": "Textil"
          },
          {
            "slug": "na-veseli-x-soudni",
            "description": "na křižovatce ulic",
            "company": {
              "phone": "224 316 800, 491 524 342",
              "email": "diakonie@diakoniebroumov.org",
              "web": "http://www.diakoniebroumov.org",
              "name": "Diakonie Broumov"
            },
            "coordinates": [
                14.42829514200007,
                50.07942290200008
            ],
            "address": "Na Veselí x Soudní",
            "unique_id": "diakonie-broumov_na-veseli-x-soudni",
            "district": "praha-4",
            "cleaning_frequency": "0",
            "accessibility": "volně",
            "trash_type": "Textil"
          },
          {
            "slug": "peroutkova-x-na-vaclavce",
            "description": "na křižovatce ulic",
            "company": {
              "phone": "224 316 800, 491 524 342",
              "email": "diakonie@diakoniebroumov.org",
              "web": "http://www.diakoniebroumov.org",
              "name": "Diakonie Broumov"
            },
            "coordinates": [
              14.389336,
              50.065129
            ],
            "address": "Peroutkova X Na Václavce",
            "unique_id": "diakonie-broumov_peroutkova-x-na-vaclavce",
            "district": "praha-5",
            "cleaning_frequency": "0",
            "accessibility": "volně",
            "trash_type": "Textil"
          }
    ]

    const potexContainersData = [
        {
            "title": "Říčany Penny",
            "address": "Pod Lihovarem 2055/4",
            "city": "Říčany",
            "lat": "50.065129",
            "lng": "14.389336"
          },
          {
            "title": "Újezd Penny",
            "address": "Starokolínská 1816",
            "city": "Újezd",
            "lat": "50.079422903",
            "lng": "14.428295143"
          },
          {
            "title": "Záběhlice",
            "address": "Choceradská 3214/44",
            "city": "Praha 4",
            "lat": "50.079422903",
            "lng": "14.428295143"
          },
          {
            "title": "Zahradní město Penny",
            "address": "Žirovnická 3160/8",
            "city": "Praha 10",
            "lat": "50.091146287",
            "lng": "14.421943246"
          },
          {
            "title": "Žižkov Penny",
            "address": "Malešická 2799/22B",
            "city": "Praha 3",
            "lat": "50.0866553",
            "lng": "14.4878892"
          },
          {
            "title": "Hostivice PENNY",
            "address": "Jetřichova",
            "city": "Hostivice",
            "lat": "50.0835464",
            "lng": "14.2331186"
          }

    ]

    const testSensorPicksData = [
      {
        "id": 23339298,
        "container_id": 30100,
        "pick_minfilllevel": 50,
        "decrease": 10,
        "code": "0003/ 043C00614",
        "pick_at": "2020-07-21T13:14:07.000Z",
        "pick_at_utc": "2020-07-21T13:14:07.000Z",
        "percent_before": 82,
        "percent_now": 11,
        "event_driven": false
      },
      {
        "id": 23340236,
        "container_id": 29869,
        "pick_minfilllevel": 30,
        "decrease": 20,
        "code": "0006/ 260C00162",
        "pick_at": "2020-07-21T14:00:34.000Z",
        "pick_at_utc": "2020-07-21T14:00:34.000Z",
        "percent_before": 26,
        "percent_now": 0,
        "event_driven": false
      }
    ];

    const testSensorPicksDataToSave = [{
      container_code: "0003/ 043C00614",
      container_id: "9fc2d5d4-9b41-581e-abb4-c9c9d8930745",
      decrease: 10,
      event_driven: false,
      percent_before: 82,
      percent_now: 11,
      pick_at: "2020-07-21T13:14:07.000Z",
      pick_at_utc: "2020-07-21T13:14:07.000Z",
      pick_minfilllevel: 50,
      station_code: "0003/ 043"
    }, {
      container_code: "0006/ 260C00162",
      container_id: "a6d9f888-7556-5846-bab3-1b020c3c5f35",
      decrease: 20,
      event_driven: false,
      percent_before: 26,
      percent_now: 0,
      pick_at: "2020-07-21T14:00:34.000Z",
      pick_at_utc: "2020-07-21T14:00:34.000Z",
      pick_minfilllevel: 30,
      station_code: "0006/ 260"
    }];


    const testSensorMeasurementDataToSave = [{
      battery_status: 3.78,
      container_code: "0008/ 075C01401",
      container_id: "004f1c5c-7fa0-5aea-b428-8e80f07b9a6e",
      firealarm: 0,
      measured_at: "2020-07-21T08:53:58.000Z",
      measured_at_utc: "2020-07-21T08:53:58.000Z",
      percent_calculated: 35,
      prediction: "2020-07-24T22:44:06.000Z",
      prediction_utc: "2020-07-24T22:44:06.000Z",
      station_code: "0008/ 075",
      temperature: 23,
      upturned: 0
    }, {
      battery_status: 3.76,
      container_code: "0009/ 148C00275",
      container_id: "83da78cd-cb6d-5cec-bb22-ce13d970adf6",
      firealarm: 0,
      measured_at: "2020-07-21T08:47:09.000Z",
      measured_at_utc: "2020-07-21T08:47:09.000Z",
      percent_calculated: 48,
      prediction: "2020-07-28T12:08:44.000Z",
      prediction_utc: "2020-07-28T12:08:44.000Z",
      station_code: "0009/ 148",
      temperature: 21,
      upturned: 0
    }]


    const testSensorMeasurementData = [
        {
            "id": 23330650,
            "container_id": 30168,
            "code": "0008/ 075C01401",
            "percent_calculated": 35,
            "upturned": 0,
            "temperature": 23,
            "battery_status": 3.78,
            "measured_at": "2020-07-21T08:53:58.000Z",
            "measured_at_utc": "2020-07-21T08:53:58.000Z",
            "prediction": "2020-07-24T22:44:06.000Z",
            "prediction_utc": "2020-07-24T22:44:06.000Z",
            "firealarm": 0
          },
          {
            "id": 23330503,
            "container_id": 29966,
            "code": "0009/ 148C00275",
            "percent_calculated": 48,
            "upturned": 0,
            "temperature": 21,
            "battery_status": 3.76,
            "measured_at": "2020-07-21T08:47:09.000Z",
            "measured_at_utc": "2020-07-21T08:47:09.000Z",
            "prediction": "2020-07-28T12:08:44.000Z",
            "prediction_utc": "2020-07-28T12:08:44.000Z",
            "firealarm": 0
          }

    ];

    const stationsSaveData = [{
      accessibility: 1,
      address: "Lochenická 538",
      code: "2021/ 011",
      district: "District-9",
      district_code: 1,
      id: "62311ad6-30ad-5dc2-993c-74119a6852ff",
      knsko_id: 115,
      latitude: 50.09318149699293,
      longitude: 14.669507124560493,
      source: "ksnko"
    }, {
      accessibility: 1,
      address: "Medinská 495",
      code: "2021/ 012",
      district: "District-9",
      district_code: 1,
      id: "08a21340-5464-58d6-8bd2-f9181d4caf50",
      knsko_id: 116,
      latitude: 50.09017510696261,
      longitude: 14.668719038004058,
      source: "ksnko"
    }, {
      accessibility: 1,
      address: "V soudním 774",
      code: "2021/ 013",
      district: "District-9",
      district_code: 1,
      id: "bd6b6b06-33e5-5228-bcf0-b538343bca6f",
      knsko_id: 117,
      latitude: 50.09498688513222,
      longitude: 14.670925688316913,
      source: "ksnko"
    }, {
      accessibility: 3,
      address: "Široká 1083/24",
      code: "0001/-147",
      district: "District-9",
      district_code: 1,
      id: "f5d9a28d-c4b6-59ac-8722-f438ae0a9b2c",
      knsko_id: null,
      latitude: 50.089747374256866,
      longitude: 14.420333728221522,
      source: "sensoneo"
    }, {
      accessibility: 3,
      address: "Široká 1083/24",
      code: "0001/-144",
      district: "District-9",
      district_code: 1,
      id: "8075863b-251a-594c-9f9f-b1dfc18f781d",
      knsko_id: null,
      latitude: 50.089747374256866,
      longitude: 14.420333728221522,
      source: "sensoneo"
    }, {
      accessibility: 3,
      address: "Ortenovo náměstí 890/2",
      code: "0001/-134",
      district: "District-9",
      district_code: 1,
      id: "a71902da-676c-5a87-8c78-b048554d9f3f",
      knsko_id: null,
      latitude: 50.10692990636685,
      longitude: 14.443819150355925,
      source: "sensoneo"
    }, {
      accessibility: 1,
      address: "U Modré školy",
      code: "14.427678950000075/50.08859091000003",
      district: "District-9",
      district_code: 1,
      id: "091c7f11-24ca-56c2-a03a-7ab215254ba8",
      knsko_id: null,
      latitude: 50.08859091000003,
      longitude: 14.427678950000075,
      source: "oict"
    }, {
      accessibility: 1,
      address: "Výrobní",
      code: "14.42829514200007/50.07942290200008",
      district: "District-9",
      district_code: 1,
      id: "62920c7f-9cfe-5853-b0a8-e9f9c59dc032",
      knsko_id: null,
      latitude: 50.07942290200008,
      longitude: 14.42829514200007,
      source: "oict"
    }, {
      accessibility: 1,
      address: "Peroutkova X Na Václavce",
      code: "14.389336/50.065129",
      district: "District-9",
      district_code: 1,
      id: "313e385a-6f79-5183-a5eb-8dbb6cf85d99",
      knsko_id: null,
      latitude: 50.065129,
      longitude: 14.389336,
      source: "oict"
    }, {
      accessibility: 3,
      address: "Žirovnická 3160/8",
      code: "14.421943246/50.091146287",
      district: "District-9",
      district_code: 1,
      id: "a1ecd2c3-556c-58fb-a0b5-0a0ca7b6a91f",
      knsko_id: null,
      latitude: "50.091146287",
      longitude: "14.421943246",
      source: "potex"
    }, {
      accessibility: 3,
      address: "Malešická 2799/22B",
      code: "14.4878892/50.0866553",
      district: "District-9",
      district_code: 1,
      id: "e8db91b9-c094-5283-91e6-f07d84771791",
      knsko_id: null,
      latitude: "50.0866553",
      longitude: "14.4878892",
      source: "potex"
    }, {
      accessibility: 3,
      address: "Jetřichova",
      code: "14.2331186/50.0835464",
      district: "District-9",
      district_code: 1,
      id: "e03cc69e-cadb-5ce0-ab6c-fa94fec98c49",
      knsko_id: null,
      latitude: "50.0835464",
      longitude: "14.2331186",
      source: "potex"
    }]
    ;

    const containersSaveData = [{
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 3,
      code: "S2021011TPV1100HV623",
      company: null,
      container_type: "1100 L normální - HV",
      id: "2887c2eb-8c9e-537b-8c89-a2d55b91df8e",
      installed_at: null,
      knsko_code: "S2021011TPV1100HV623",
      knsko_id: 623,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 011",
      total_volume: null,
      trash_type: 5
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 3,
      code: "S2021011TPV1100HV624",
      company: null,
      container_type: "1100 L normální - HV",
      id: "a4191f98-cbc2-5e4f-86e9-73deeb5bbcbb",
      installed_at: null,
      knsko_code: "S2021011TPV1100HV624",
      knsko_id: 624,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 011",
      total_volume: null,
      trash_type: 5
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 4,
      code: "S2021011TUV1100HV626",
      company: null,
      container_type: "1100 L normální - HV",
      id: "5490bdb2-fd14-5129-bd5a-d81fca9d90f9",
      installed_at: null,
      knsko_code: "S2021011TUV1100HV626",
      knsko_id: 626,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 011",
      total_volume: null,
      trash_type: 6
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 1,
      code: "S2021011TNKV240HV622",
      company: null,
      container_type: "240 L normální - HV",
      id: "4b852a06-f387-5b73-8465-b2e987ce90da",
      installed_at: null,
      knsko_code: "S2021011TNKV240HV622",
      knsko_id: 622,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 011",
      total_volume: null,
      trash_type: 4
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 4,
      cleaning_frequency_interval: 1,
      code: "S2021011TSBV3350SV625",
      company: null,
      container_type: "3350 L Atomium Reflex - SV",
      id: "852e2e55-e116-529f-8d76-b71582db329c",
      installed_at: null,
      knsko_code: "S2021011TSBV3350SV625",
      knsko_id: 625,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 011",
      total_volume: null,
      trash_type: 1
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 4,
      cleaning_frequency_interval: 1,
      code: "S2021011TSCV3350SV621",
      company: null,
      container_type: "3350 L Atomium Reflex - SV",
      id: "6eaea1c0-9f38-58c8-90f7-668b27785200",
      installed_at: null,
      knsko_code: "S2021011TSCV3350SV621",
      knsko_id: 621,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 011",
      total_volume: null,
      trash_type: 7
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 3,
      code: "S2021012TPV1100HV629",
      company: null,
      container_type: "1100 L normální - HV",
      id: "feec14e8-9a69-56c9-8e6f-b834fd70687f",
      installed_at: null,
      knsko_code: "S2021012TPV1100HV629",
      knsko_id: 629,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 012",
      total_volume: null,
      trash_type: 5
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 4,
      code: "S2021012TUV1100HV631",
      company: null,
      container_type: "1100 L normální - HV",
      id: "248d4901-7d84-510d-be19-54a6eb1777d0",
      installed_at: null,
      knsko_code: "S2021012TUV1100HV631",
      knsko_id: 631,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 012",
      total_volume: null,
      trash_type: 6
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 1,
      code: "S2021012TNKV240HV628",
      company: null,
      container_type: "240 L normální - HV",
      id: "fb650460-8a55-5a26-8229-0e352e4e1d21",
      installed_at: null,
      knsko_code: "S2021012TNKV240HV628",
      knsko_id: 628,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 012",
      total_volume: null,
      trash_type: 4
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 4,
      cleaning_frequency_interval: 1,
      code: "S2021012TSBV3350SV630",
      company: null,
      container_type: "3350 L Atomium Reflex - SV",
      id: "13375fa9-81c0-5c1a-bf63-b788f41e95d1",
      installed_at: null,
      knsko_code: "S2021012TSBV3350SV630",
      knsko_id: 630,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 012",
      total_volume: null,
      trash_type: 1
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 4,
      cleaning_frequency_interval: 1,
      code: "S2021012TSCV3350SV627",
      company: null,
      container_type: "3350 L Atomium Reflex - SV",
      id: "d16fdaeb-392b-5f45-91c7-9f8bd11a2621",
      installed_at: null,
      knsko_code: "S2021012TSCV3350SV627",
      knsko_id: 627,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 012",
      total_volume: null,
      trash_type: 7
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 4,
      cleaning_frequency_interval: 1,
      code: "S2021012TKOV1100SV21995",
      company: null,
      container_type: "1100 L mini H - SV",
      id: "55f21676-489b-5d4a-a6ef-cb1957fe1449",
      installed_at: null,
      knsko_code: "S2021012TKOV1100SV21995",
      knsko_id: 21995,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 012",
      total_volume: null,
      trash_type: 3
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 4,
      code: "S2021013TPV1100HV634",
      company: null,
      container_type: "1100 L normální - HV",
      id: "9a277c08-f564-50dc-8583-ebe8f598e0c3",
      installed_at: null,
      knsko_code: "S2021013TPV1100HV634",
      knsko_id: 634,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 013",
      total_volume: null,
      trash_type: 5
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 4,
      code: "S2021013TUV1100HV636",
      company: null,
      container_type: "1100 L normální - HV",
      id: "76e79816-8022-5cf9-867c-bce1c5b16be9",
      installed_at: null,
      knsko_code: "S2021013TUV1100HV636",
      knsko_id: 636,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 013",
      total_volume: null,
      trash_type: 6
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 1,
      cleaning_frequency_interval: 1,
      code: "S2021013TNKV240HV633",
      company: null,
      container_type: "240 L normální - HV",
      id: "912efc54-fea1-5b64-af05-a650bf866f32",
      installed_at: null,
      knsko_code: "S2021013TNKV240HV633",
      knsko_id: 633,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 013",
      total_volume: null,
      trash_type: 4
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 4,
      cleaning_frequency_interval: 1,
      code: "S2021013TSBV3350SV635",
      company: null,
      container_type: "3350 L Atomium Reflex - SV",
      id: "2ef22c59-515e-5e6a-ba40-699cdd8a3e2c",
      installed_at: null,
      knsko_code: "S2021013TSBV3350SV635",
      knsko_id: 635,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 013",
      total_volume: null,
      trash_type: 1
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 4,
      cleaning_frequency_interval: 1,
      code: "S2021013TSCV3350SV632",
      company: null,
      container_type: "3350 L Atomium Reflex - SV",
      id: "2e01cefe-80d4-5d30-98ea-e37431e447e9",
      installed_at: null,
      knsko_code: "S2021013TSCV3350SV632",
      knsko_id: 632,
      network: null,
      prediction: null,
      source: "ksnko",
      station_code: "2021/ 013",
      total_volume: null,
      trash_type: 7
    }, {
      bin_type: "Semi-underground",
      code: "0001/-147C01602",
      id: "33f18e17-d294-58af-a021-22f95e962b31",
      installed_at: "2019-01-28T00:00:00.000Z",
      network: "Lora",
      prediction: "2020-07-23T23:17:53.000Z",
      source: "sensoneo",
      station_code: "0001/-147",
      total_volume: 2000,
      trash_type: 5
    }, {
      bin_type: "Semi-underground",
      code: "0001/-147C01603",
      id: "56412c30-8106-5efc-8ac4-b1bf40c8b468",
      installed_at: "2019-01-28T00:00:00.000Z",
      network: "Lora",
      prediction: "2020-08-16T17:44:42.000Z",
      source: "sensoneo",
      station_code: "0001/-147",
      total_volume: 1100,
      trash_type: 3
    }, {
      bin_type: "Semi-underground",
      code: "0001/-144C01604",
      id: "4ea60a9d-7cbe-518a-860d-75535c9bf398",
      installed_at: "2019-01-28T00:00:00.000Z",
      network: "SIGFOX",
      prediction: "2020-08-01T21:26:55.000Z",
      source: "sensoneo",
      station_code: "0001/-144",
      total_volume: 1100,
      trash_type: 4
    }, {
      bin_type: "Schäfer/Europa-OV",
      code: "0001/-144C00403",
      id: "52d2c520-76d2-5f39-b265-ac96a2bbcb00",
      installed_at: "2018-12-18T00:00:00.000Z",
      network: "SIGFOX",
      prediction: null,
      source: "sensoneo",
      station_code: "0001/-144",
      total_volume: 3000,
      trash_type: 5
    }, {
      bin_type: "Schäfer/Europa-OV",
      code: "0001/-134C00404",
      id: "8dd2c0ae-4375-5e4e-98d3-31ead19c8370",
      installed_at: "2018-12-18T00:00:00.000Z",
      network: "SIGFOX",
      prediction: "2020-07-22T10:41:05.000Z",
      source: "sensoneo",
      station_code: "0001/-134",
      total_volume: 3000,
      trash_type: 6
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 0,
      cleaning_frequency_interval: 0,
      code: "14.42829514200007/50.07942290200008C14.428295143-50.079422903",
      id: "5cbc59c7-f157-5de3-a27d-1d7476127843",
      installed_at: null,
      network: null,
      prediction: null,
      source: "potex",
      station_code: "14.42829514200007/50.07942290200008",
      total_volume: null,
      trash_type: 8
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 0,
      cleaning_frequency_interval: 0,
      code: "14.389336/50.065129C14.389336-50.065129",
      id: "8c6664fe-43a7-5129-a7ae-14771091e21c",
      installed_at: null,
      network: null,
      prediction: null,
      source: "potex",
      station_code: "14.389336/50.065129",
      total_volume: null,
      trash_type: 8
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 0,
      cleaning_frequency_interval: 0,
      code: "14.421943246/50.091146287CPraha 10",
      id: "aa890ec9-4bc0-56f8-85f5-67c961017b36",
      installed_at: null,
      network: null,
      prediction: null,
      source: "potex",
      station_code: "14.421943246/50.091146287",
      total_volume: null,
      trash_type: 8
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 0,
      cleaning_frequency_interval: 0,
      code: "14.4878892/50.0866553CPraha 3",
      id: "6d6ad346-7532-5a9c-8fa0-4bbc51564502",
      installed_at: null,
      network: null,
      prediction: null,
      source: "potex",
      station_code: "14.4878892/50.0866553",
      total_volume: null,
      trash_type: 8
    }, {
      bin_type: null,
      cleaning_frequency_frequency: 0,
      cleaning_frequency_interval: 0,
      code: "14.2331186/50.0835464CHostivice",
      id: "2ae92035-f8b9-5405-a797-5b564ea72fba",
      installed_at: null,
      network: null,
      prediction: null,
      source: "potex",
      station_code: "14.2331186/50.0835464",
      total_volume: null,
      trash_type: 8
    }];

    // tslint:enable

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new SortedWasteStationsWorkerPg();

        const getOutputStream = async (data, stream) => {
            stream.push(data);
            stream.push(null);
            return stream;
          };

        const measurementsDataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        const picksDataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        const ksnkoContainersDataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        const sensorsContainersDataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        const oictDataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        const potexDataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        sandbox.stub(worker.sensorsMeasurementsDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(testSensorMeasurementData, measurementsDataStream));
        sandbox.spy(worker.sensorsMeasurementsDatasource, "getAll");
        sandbox.stub(worker.sensorsMeasurementsModel, "save");

        sandbox.stub(worker.sensorsPicksDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(testSensorPicksData, picksDataStream));
        sandbox.spy(worker.sensorsPicksDatasource, "getAll");
        sandbox.stub(worker.sensorsPicksModel, "save");

        sandbox.stub(worker, "getKSNKOToken")
        .callsFake(() => {
          return "token";
        });

        sandbox.stub(worker.ksnkoStationsDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(ksnkoStationsData, ksnkoContainersDataStream));
        sandbox.spy(worker.ksnkoStationsDatasource, "getAll");

        sandbox.stub(worker.sensorsContainersDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(sensorContainersData, sensorsContainersDataStream));
        sandbox.spy(worker.sensorsContainersDatasource, "getAll");

        sandbox.stub(worker.oictDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(oictContainersData, oictDataStream));
        sandbox.spy(worker.oictDatasource, "getAll");

        sandbox.stub(worker.potexDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(potexContainersData, potexDataStream));
        sandbox.spy(worker.potexDatasource, "getAll");

        sandbox.stub(worker.stationsModel, "saveBySqlFunction");
        sandbox.stub(worker.sensorsContainersModel, "saveBySqlFunction");

        sandbox.stub(worker.cityDistrictsModel, "findOne")
        .callsFake(() => {
            return {
                properties: {
                    id: 1,
                    slug: "District-9",
                },
            };
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by updateSensorsMeasurement method", async () => {
        await worker.updateSensorsMeasurement();
        sandbox.assert.calledOnce(worker.sensorsMeasurementsDatasource.getAll);
        sandbox.assert.calledOnce(worker.sensorsMeasurementsModel.save);
        sandbox.assert.calledWith(worker.sensorsMeasurementsModel.save, testSensorMeasurementDataToSave);

        sandbox.assert.callOrder(
            worker.sensorsMeasurementsDatasource.getAll,
            worker.sensorsMeasurementsModel.save,
        );
    });

    it("should calls the correct methods by updateSensorsPicks method", async () => {
        await worker.updateSensorsPicks();
        sandbox.assert.calledOnce(worker.sensorsPicksDatasource.getAll);
        sandbox.assert.calledOnce(worker.sensorsPicksModel.save);
        sandbox.assert.calledWith(worker.sensorsPicksModel.save, testSensorPicksDataToSave);

        sandbox.assert.callOrder(
            worker.sensorsPicksDatasource.getAll,
            worker.sensorsPicksModel.save,
        );
    });

    it("should calls the correct methods by updateSensorsMeasurement method", async () => {
        await worker.updateSensorsMeasurement();
        sandbox.assert.calledOnce(worker.sensorsMeasurementsDatasource.getAll);
        sandbox.assert.calledOnce(worker.sensorsMeasurementsModel.save);
        sandbox.assert.calledWith(worker.sensorsMeasurementsModel.save, testSensorMeasurementDataToSave);

        sandbox.assert.callOrder(
            worker.sensorsMeasurementsDatasource.getAll,
            worker.sensorsMeasurementsModel.save,
        );
    });

    it("should calls the correct methods by updateStationsAndContainers method", async () => {
        await worker.updateStationsAndContainers();
        sandbox.assert.calledOnce(worker.getKSNKOToken);
        sandbox.assert.calledOnce(worker.ksnkoStationsDatasource.getAll);
        sandbox.assert.calledOnce(worker.sensorsContainersDatasource.getAll);
        sandbox.assert.calledOnce(worker.oictDatasource.getAll);
        sandbox.assert.calledOnce(worker.potexDatasource.getAll);
        sandbox.assert.calledOnce(worker.stationsModel.saveBySqlFunction);
        sandbox.assert.calledOnce(worker.sensorsContainersModel.saveBySqlFunction);
        sandbox.assert.calledWith(worker.stationsModel.saveBySqlFunction, stationsSaveData, ["code"]);
        sandbox.assert.calledWith(worker.sensorsContainersModel.saveBySqlFunction, containersSaveData, ["code"]);

        sandbox.assert.callOrder(
            worker.getKSNKOToken,
            worker.ksnkoStationsDatasource.getAll,
            worker.sensorsContainersDatasource.getAll,
            worker.oictDatasource.getAll,
            worker.potexDatasource.getAll,
            worker.stationsModel.saveBySqlFunction,
            worker.sensorsContainersModel.saveBySqlFunction,
        );
    });
});
