import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CircleListResponse,
  CircleRequest,
  CircleStatusResponse
} from '../models/circle.models';
import { ApiResponse } from '../models/api.models';

/**
 * Family & friends circle: a mutual, accepted link between two users. A request that is sent to
 * someone who already asked the current user is accepted by the server instead of creating a
 * second row.
 */
@Injectable({ providedIn: 'root' })
export class CircleService {
  private readonly http = inject(HttpClient);

  list(): Observable<CircleListResponse> {
    return this.http.get<ApiResponse<CircleListResponse>>(`${environment.apiUrl}/circles`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  /** Ids of the users in the accepted circle; used to gate who can be messaged. */
  acceptedUserIds(): Observable<Set<number>> {
    return this.list().pipe(map((response) => new Set((response.circles ?? []).map((circle) => circle.userId))));
  }

  /** Sends a request; sending back to someone who already asked accepts instead. */
  sendRequest(userId: number): Observable<CircleRequest> {
    return this.http.post<ApiResponse<CircleRequest>>(`${environment.apiUrl}/circles/requests`, { userId }).pipe(
      map((response) => this.unwrap(response))
    );
  }

  accept(circleId: number): Observable<CircleRequest> {
    return this.http.post<ApiResponse<CircleRequest>>(`${environment.apiUrl}/circles/requests/accept`, { circleId }).pipe(
      map((response) => this.unwrap(response))
    );
  }

  reject(circleId: number): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/circles/requests/reject`, { circleId });
  }

  remove(circleId: number): Observable<void> {
    return this.http.request<void>('delete', `${environment.apiUrl}/circles`, { body: { circleId } });
  }

  statusWith(userId: number): Observable<CircleStatusResponse> {
    return this.http.get<ApiResponse<CircleStatusResponse>>(`${environment.apiUrl}/circles/status/${userId}`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (typeof response === 'object' && response !== null && 'data' in response) {
      return response.data;
    }
    return response as T;
  }
}
