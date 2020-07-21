"use strict";

import { SortedWasteStations } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";

import { config } from "../../../src/core/config";
import { DataSourceStream } from "../../../src/core/datasources/DataSourceStream";
import { SortedWasteStationsWorkerPg } from "../../../src/modules/sortedwastestations";
import { waitTillStreamEnds } from "../../helpers";
import { emit } from "process";


describe("SortedWasteStationsWorkerPg", () => {

    let worker;
    let sandbox;

    // tslint:disable


    const iprStationsData = [
        {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.422439869000073,
                50.09047325700004
              ]
            },
            "properties": {
              "OBJECTID": 5346,
              "ID": 5346,
              "STATIONNUMBER": "0001/-132",
              "STATIONNAME": "Kozí 914/9",
              "CITYDISTRICTRUIANCODE": 500054,
              "CITYDISTRICT": "Praha 1",
              "PRISTUP": "obyvatelům domu"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.421943246000069,
                50.09114628700007
              ]
            },
            "properties": {
              "OBJECTID": 5347,
              "ID": 5347,
              "STATIONNUMBER": "0001/-134",
              "STATIONNAME": "Bílkova 857/20",
              "CITYDISTRICTRUIANCODE": 500054,
              "CITYDISTRICT": "Praha 1",
              "PRISTUP": "obyvatelům domu"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.42829514300007,
                50.07942290300008
              ]
            },
            "properties": {
              "OBJECTID": 5348,
              "ID": 5348,
              "STATIONNUMBER": "0001/-144",
              "STATIONNAME": "Krakovská 582/23",
              "CITYDISTRICTRUIANCODE": 500054,
              "CITYDISTRICT": "Praha 1",
              "PRISTUP": "obyvatelům domu"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.427678951000075,
                50.08859091200003
              ]
            },
            "properties": {
              "OBJECTID": 5349,
              "ID": 5349,
              "STATIONNUMBER": "0001/-147",
              "STATIONNAME": "Králodvorská 1086/14",
              "CITYDISTRICTRUIANCODE": 500054,
              "CITYDISTRICT": "Praha 1",
              "PRISTUP": "obyvatelům domu"
            }
          }
    ]

    const iprContainersData = [
        {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.466997410000033,
                50.08438533000003
              ]
            },
            "properties": {
              "OBJECTID": 21993,
              "STATIONID": 5349,
              "TRASHTYPENAME": "Elektrozařízení",
              "CLEANINGFREQUENCYCODE": 41,
              "CONTAINERTYPE": "2150 MEVA SV"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.444171856000025,
                50.06293381300003
              ]
            },
            "properties": {
              "OBJECTID": 21994,
              "STATIONID": 5349,
              "TRASHTYPENAME": "Elektrozařízení",
              "CLEANINGFREQUENCYCODE": 41,
              "CONTAINERTYPE": "2150 MEVA SV"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.392175782000038,
                50.10114180800008
              ]
            },
            "properties": {
              "OBJECTID": 21995,
              "STATIONID": 5347,
              "TRASHTYPENAME": "Elektrozařízení",
              "CLEANINGFREQUENCYCODE": 41,
              "CONTAINERTYPE": "2150 MEVA SV"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.37239457100003,
                50.080122516000074
              ]
            },
            "properties": {
              "OBJECTID": 21996,
              "STATIONID": 5347,
              "TRASHTYPENAME": "Elektrozařízení",
              "CLEANINGFREQUENCYCODE": 41,
              "CONTAINERTYPE": "2150 MEVA SV"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                14.38306370500004,
                50.08546637000006
              ]
            },
            "properties": {
              "OBJECTID": 21997,
              "STATIONID": 5349,
              "TRASHTYPENAME": "Elektrozařízení",
              "CLEANINGFREQUENCYCODE": 41,
              "CONTAINERTYPE": "2150 MEVA SV"
            }
          }

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

    const testSensorPicksDataToSave = [
        {
          "container_code": "0003/ 043C00614",
          "percent_before": 82,
          "percent_now": 11,
          "event_driven": false,
          "decrease": 10,
          "pick_at": "2020-07-21T13:14:07.000Z",
          "pick_at_utc": "2020-07-21T13:14:07.000Z",
          "pick_minfilllevel": 50
        },
        {
          "container_code": "0006/ 260C00162",
          "percent_before": 26,
          "percent_now": 0,
          "event_driven": false,
          "decrease": 20,
          "pick_at": "2020-07-21T14:00:34.000Z",
          "pick_at_utc": "2020-07-21T14:00:34.000Z",
          "pick_minfilllevel": 30
        }
      ];


    const testSensorMeasurementDataToSave = [
        {
            "container_code": "0008/ 075C01401",
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
            "container_code": "0009/ 148C00275",
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
        ]

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

    const stationsSaveData = [
        {
          "accessibility": 2,
          "address": "Králodvorská 1086/14",
          "code": "0001/-147",
          "district": "District-9",
          "district_code": 1,
          "latitude": 50.08859091200003,
          "longitude": 14.427678951000075,
          "source": "ipr"
        },
        {
          "accessibility": 2,
          "address": "Bílkova 857/20",
          "code": "0001/-134",
          "district": "District-9",
          "district_code": 1,
          "latitude": 50.09114628700007,
          "longitude": 14.421943246000069,
          "source": "ipr"
        },
        {
          "accessibility": 3,
          "address": "Široká 1083/24",
          "code": "0001/-144",
          "district": "District-9",
          "district_code": 1,
          "latitude": 50.089747374256866,
          "longitude": 14.420333728221522,
          "source": "sensoneo"
        },
        {
          "accessibility": 1,
          "address": "Výrobní",
          "code": "14.42829514200007/50.07942290200008",
          "district": "District-9",
          "district_code": 1,
          "latitude": 50.07942290200008,
          "longitude": 14.42829514200007,
          "source": "oict"
        },
        {
          "accessibility": 1,
          "address": "Peroutkova X Na Václavce",
          "code": "14.389336/50.065129",
          "district": "District-9",
          "district_code": 1,
          "latitude": 50.065129,
          "longitude": 14.389336,
          "source": "oict"
        },
        {
          "accessibility": 3,
          "address": "Malešická 2799/22B",
          "code": "14.4878892/50.0866553",
          "district": "District-9",
          "district_code": 1,
          "latitude": "50.0866553",
          "longitude": "14.4878892",
          "source": "potex"
        },
        {
          "accessibility": 3,
          "address": "Jetřichova",
          "code": "14.2331186/50.0835464",
          "district": "District-9",
          "district_code": 1,
          "latitude": "50.0835464",
          "longitude": "14.2331186",
          "source": "potex"
        }
      ]


    const containersSaveData = [
        {
          code: '0001/-147C21993',
          cleaning_frequency_interval: 4,
          cleaning_frequency_frequency: 1,
          station_code: '0001/-147',
          total_volume: undefined,
          trash_type: 2,
          prediction: undefined,
          bin_type: '2150 MEVA SV',
          installed_at: undefined,
          network: undefined,
          source: 'ipr'
        },
        {
          code: '0001/-147C21994',
          cleaning_frequency_interval: 4,
          cleaning_frequency_frequency: 1,
          station_code: '0001/-147',
          total_volume: undefined,
          trash_type: 2,
          prediction: undefined,
          bin_type: '2150 MEVA SV',
          installed_at: undefined,
          network: undefined,
          source: 'ipr'
        },
        {
          code: '0001/-147C21997',
          cleaning_frequency_interval: 4,
          cleaning_frequency_frequency: 1,
          station_code: '0001/-147',
          total_volume: undefined,
          trash_type: 2,
          prediction: undefined,
          bin_type: '2150 MEVA SV',
          installed_at: undefined,
          network: undefined,
          source: 'ipr'
        },
        {
          trash_type: 5,
          code: '0001/-147C01602',
          station_code: '0001/-147',
          total_volume: 2000,
          prediction: '2020-07-23T23:17:53.000Z',
          bin_type: 'Semi-underground',
          installed_at: '2019-01-28T00:00:00.000Z',
          network: 'Lora',
          source: 'sensoneo'
        },
        {
          trash_type: 3,
          code: '0001/-147C01603',
          station_code: '0001/-147',
          total_volume: 1100,
          prediction: '2020-08-16T17:44:42.000Z',
          bin_type: 'Semi-underground',
          installed_at: '2019-01-28T00:00:00.000Z',
          network: 'Lora',
          source: 'sensoneo'
        },
        {
          code: '0001/-147C14.427678950000075-50.08859091000003-diakonie-broumov_u-modre-skoly',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '0001/-147',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'oict'
        },
        {
          code: '0001/-147C14.427678950000075-50.08859091000003-diakonie-broumov_zahradnickova',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '0001/-147',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'oict'
        },
        {
          code: '0001/-134C21995',
          cleaning_frequency_interval: 4,
          cleaning_frequency_frequency: 1,
          station_code: '0001/-134',
          total_volume: undefined,
          trash_type: 2,
          prediction: undefined,
          bin_type: '2150 MEVA SV',
          installed_at: undefined,
          network: undefined,
          source: 'ipr'
        },
        {
          code: '0001/-134C21996',
          cleaning_frequency_interval: 4,
          cleaning_frequency_frequency: 1,
          station_code: '0001/-134',
          total_volume: undefined,
          trash_type: 2,
          prediction: undefined,
          bin_type: '2150 MEVA SV',
          installed_at: undefined,
          network: undefined,
          source: 'ipr'
        },
        {
          trash_type: 6,
          code: '0001/-134C00404',
          station_code: '0001/-134',
          total_volume: 3000,
          prediction: '2020-07-22T10:41:05.000Z',
          bin_type: 'Schäfer/Europa-OV',
          installed_at: '2018-12-18T00:00:00.000Z',
          network: 'SIGFOX',
          source: 'sensoneo'
        },
        {
          code: '0001/-134C14.421943246-50.091146287',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '0001/-134',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'potex'
        },
        {
          trash_type: 4,
          code: '0001/-144C01604',
          station_code: '0001/-144',
          total_volume: 1100,
          prediction: '2020-08-01T21:26:55.000Z',
          bin_type: 'Semi-underground',
          installed_at: '2019-01-28T00:00:00.000Z',
          network: 'SIGFOX',
          source: 'sensoneo'
        },
        {
          trash_type: 5,
          code: '0001/-144C00403',
          station_code: '0001/-144',
          total_volume: 3000,
          prediction: null,
          bin_type: 'Schäfer/Europa-OV',
          installed_at: '2018-12-18T00:00:00.000Z',
          network: 'SIGFOX',
          source: 'sensoneo'
        },
        {
          code: '14.42829514200007/50.07942290200008C14.42829514200007-50.07942290200008-diakonie-broumov_vyrobni',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '14.42829514200007/50.07942290200008',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'oict'
        },
        {
          code: '14.42829514200007/50.07942290200008C14.428295143-50.079422903',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '14.42829514200007/50.07942290200008',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'potex'
        },
        {
          code: '14.389336/50.065129C14.389336-50.065129-diakonie-broumov_peroutkova-x-na-vaclavce',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '14.389336/50.065129',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'oict'
        },
        {
          code: '14.389336/50.065129C14.389336-50.065129',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '14.389336/50.065129',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'potex'
        },
        {
          code: '14.4878892/50.0866553CPraha 3',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '14.4878892/50.0866553',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'potex'
        },
        {
          code: '14.2331186/50.0835464CHostivice',
          cleaning_frequency_interval: 0,
          cleaning_frequency_frequency: 0,
          station_code: '14.2331186/50.0835464',
          total_volume: null,
          trash_type: 8,
          prediction: null,
          bin_type: null,
          installed_at: null,
          network: null,
          source: 'potex'
        }
      ]


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

        const iprStationsDataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        const iprContainersDataStream =  new DataSourceStream({
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

        sandbox.stub(worker.iprStationsDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(iprStationsData, iprStationsDataStream));
        sandbox.spy(worker.iprStationsDatasource, "getAll");

        sandbox.stub(worker.iprContainersDatasource, "getOutputStream")
        .callsFake(() => getOutputStream(iprContainersData, iprContainersDataStream));
        sandbox.spy(worker.iprContainersDatasource, "getAll");

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
                    name: "District-9",
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
        sandbox.assert.calledOnce(worker.iprStationsDatasource.getAll);
        sandbox.assert.calledOnce(worker.iprContainersDatasource.getAll);
        sandbox.assert.calledOnce(worker.sensorsContainersDatasource.getAll);
        sandbox.assert.calledOnce(worker.oictDatasource.getAll);
        sandbox.assert.calledOnce(worker.potexDatasource.getAll);
        sandbox.assert.calledOnce(worker.stationsModel.saveBySqlFunction);
        sandbox.assert.calledOnce(worker.sensorsContainersModel.saveBySqlFunction);
        sandbox.assert.calledWith(worker.stationsModel.saveBySqlFunction, stationsSaveData, ["code"]);
        sandbox.assert.calledWith(worker.sensorsContainersModel.saveBySqlFunction, containersSaveData, ["code"]);

        sandbox.assert.callOrder(
            worker.iprStationsDatasource.getAll,
            worker.iprContainersDatasource.getAll,
            worker.sensorsContainersDatasource.getAll,
            worker.oictDatasource.getAll,
            worker.potexDatasource.getAll,
            worker.stationsModel.saveBySqlFunction,
            worker.sensorsContainersModel.saveBySqlFunction,
        );
    });
});
