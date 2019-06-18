import { sdk } from './sdk';
import { iOS } from '../../env';
import { jsonp } from '../../utils';

var x_PI = 3.14159265358979324 * 3000.0 / 180.0;
var PI = 3.1415926535897932384626;
var a = 6378245.0;
var ee = 0.00669342162296594323;

function wgs84togcj02(lng, lat) {
    if (out_of_china(lng, lat)) {
        return [lng, lat];
    } else {
        var dlat = transformlat(lng - 105.0, lat - 35.0);
        var dlng = transformlng(lng - 105.0, lat - 35.0);
        var radlat = lat / 180.0 * PI;
        var magic = Math.sin(radlat);
        magic = 1 - ee * magic * magic;
        var sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
        dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
        var mglat = Number(lat) + Number(dlat);
        var mglng = Number(lng) + Number(dlng);
        return [mglng, mglat];
    }
}

function gcj02tobd09(lng, lat) {
    var z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_PI);
    var theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_PI);
    var bd_lng = z * Math.cos(theta) + 0.0065;
    var bd_lat = z * Math.sin(theta) + 0.006;
    return [bd_lng, bd_lat];
}

function wgs84tobdo9(loc_lon, loc_lat) {
    var loc = wgs84togcj02(loc_lon, loc_lat);
    return gcj02tobd09(loc[0], loc[1]);
}

function transformlat(lng, lat) {
    var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformlng(lng, lat) {
    var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}

function out_of_china(lng, lat) {
    return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
}

export function getLocation(cb) {
    return new Promise((fulfill, reject) => {
        if (!sdk.execute('getLocation', fulfill, reject)) {
            reject("didn't find cordova");
        }
    }).then(loc => {
        if (!loc || (loc.lat === 5e-324 && loc.lon === 5e-324) || loc.lon == -1) {
            throw new Error('get location by native failed!!');
        }
        var [longitude, latitude] = iOS
            ? wgs84tobdo9(loc.lon, loc.lat)
            : [loc.lon, loc.lat];
        var res = { longitude, latitude };
        cb && cb(res);
        return res;
    });
}

// 根据经纬度获得地址信息` longitude 经度   latitude纬度
export function getAddressInfoByLonLat(longitude, latitude, output = "json", pois = 1, coordtype = 'bd09ll') {
    return jsonp(`https://api.map.baidu.com/geocoder/v2/?`, {
        ak: '',
        location: `${latitude},${longitude}`,
        output,
        pois,
        coordtype,
    });
}

var BAIDU_API_KEY = ['~'];

export async function getSuggestAddress(
    keywords,
    longitude,
    latitude,
    region = '全国'
) {
    var random = parseInt(Math.random() * BAIDU_API_KEY.length, 10);
    var ak = BAIDU_API_KEY[random];
    var params = {
        q: keywords,
        output: 'json',
        city_limit: true,
        region: region,
        ak: ak
    };
    if (longitude && latitude) {
        params.location = `${latitude},${longitude}`;
    }
    var data = await jsonp(
        '//api.map.baidu.com/place/v2/suggestion?',
        params
    );
    if (data && data.result && data.result.length) {
        return data.result;
    } else {
        throw new Error('fail');
    }
}