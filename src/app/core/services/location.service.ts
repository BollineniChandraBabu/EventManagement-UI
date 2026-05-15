import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  source: 'GPS' | 'IP';
}

interface IpApiResponse {
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country_name?: string;
  country?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  constructor(private readonly http: HttpClient) {}

  async getUserLocation(): Promise<UserLocation | null> {
    const gpsLocation = await this.getLocationFromBrowser();
    if (gpsLocation?.country && gpsLocation?.region) {
      return gpsLocation;
    }

    const ipLocation = await this.getLocationFromIP();
    if (gpsLocation && ipLocation) {
      return {
        ...gpsLocation,
        city: ipLocation.city,
        region: ipLocation.region,
        country: ipLocation.country
      };
    }
    if (ipLocation) {
      return ipLocation;
    }

    return null;
  }

  private getLocationFromBrowser(): Promise<UserLocation | null> {
    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'GPS'
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }

  private async getLocationFromIP(): Promise<UserLocation | null> {
    try {
      const response = await firstValueFrom(this.http.get<IpApiResponse>('https://ipapi.co/json/'));

      if (typeof response.latitude !== 'number' || typeof response.longitude !== 'number') {
        return null;
      }

      return {
        latitude: response.latitude,
        longitude: response.longitude,
        city: response.city,
        region: response.region,
        country: response.country_name ?? response.country,
        source: 'IP'
      };
    } catch {
      return null;
    }
  }
}
