import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const isChatRequest = req.url.includes('/chat');
  // Agent calls can take several seconds (multi-step LLM runs); the page shows its own progress UI
  // instead of blocking the whole screen with the global overlay.
  const isAgentRequest = req.url.includes('/agent/');
  // Images load inside the preview, which shows its own placeholder.
  const isEmailImageRequest = /\/emails\/status\/\d+\/image$/.test(req.url);

  if (isChatRequest || isAgentRequest || isEmailImageRequest) {
    return next(req);
  }

  loading.start();

  return next(req).pipe(finalize(() => loading.stop()));
};
