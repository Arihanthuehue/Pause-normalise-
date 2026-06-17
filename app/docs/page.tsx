'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function DocsPage() {
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    // Add viewport meta if not present
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1');
      document.head.appendChild(viewport);
    }

    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    link.id = 'swagger-ui-css';
    document.head.appendChild(link);

    // Load Swagger UI JS Bundle
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.async = true;
    script.id = 'swagger-ui-js';
    script.onload = () => {
      const scriptPreset = document.createElement('script');
      scriptPreset.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js';
      scriptPreset.async = true;
      scriptPreset.id = 'swagger-ui-preset-js';
      scriptPreset.onload = () => {
        // Initialize Swagger UI with type-safe properties
        const w = window as typeof window & {
          SwaggerUIBundle?: ((config: Record<string, unknown>) => unknown) & {
            presets: { apis: unknown };
            plugins: { DownloadUrl: unknown };
          };
          SwaggerUIStandalonePreset?: unknown;
          ui?: unknown;
        };

        if (w.SwaggerUIBundle) {
          w.ui = w.SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              w.SwaggerUIBundle.presets.apis,
              w.SwaggerUIStandalonePreset
            ],
            plugins: [
              w.SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout"
          });
        }
      };
      document.head.appendChild(scriptPreset);
    };
    document.head.appendChild(script);

    // Cleanup resources on unmount
    return () => {
      document.getElementById('swagger-ui-css')?.remove();
      document.getElementById('swagger-ui-js')?.remove();
      document.getElementById('swagger-ui-preset-js')?.remove();
    };
  }, []);

  return (
    <div 
      className="swagger-wrapper"
      style={{ 
        backgroundColor: '#ffffff', 
        color: '#3b4151',
        minHeight: '100vh', 
        fontFamily: 'sans-serif',
        // @ts-expect-error
        '--background': '#ffffff',
        '--foreground': '#3b4151'
      }}
    >
      <style>{`
        .swagger-wrapper {
          color-scheme: light !important;
        }
        .swagger-wrapper #swagger-ui {
          background-color: #ffffff !important;
          color: #3b4151 !important;
          padding: 0 20px;
        }
        .swagger-wrapper .swagger-ui {
          color: #3b4151 !important;
        }
        .swagger-wrapper .swagger-ui .info .title,
        .swagger-wrapper .swagger-ui .info p,
        .swagger-wrapper .swagger-ui .info li,
        .swagger-wrapper .swagger-ui .info table,
        .swagger-wrapper .swagger-ui .opblock .opblock-summary-description,
        .swagger-wrapper .swagger-ui .opblock .opblock-section-header h4,
        .swagger-wrapper .swagger-ui .opblock .opblock-title_normal,
        .swagger-wrapper .swagger-ui .parameter__name,
        .swagger-wrapper .swagger-ui .parameter__type,
        .swagger-wrapper .swagger-ui .parameter__deprecated,
        .swagger-wrapper .swagger-ui .parameter__in,
        .swagger-wrapper .swagger-ui .response-col_status,
        .swagger-wrapper .swagger-ui .response-col_description,
        .swagger-wrapper .swagger-ui table thead tr th,
        .swagger-wrapper .swagger-ui .tab li button,
        .swagger-wrapper .swagger-ui .dialog-ux .modal-ux-header h3,
        .swagger-wrapper .swagger-ui .dialog-ux .modal-ux-content p {
          color: #3b4151 !important;
        }
        .swagger-wrapper .swagger-ui .markdown p,
        .swagger-wrapper .swagger-ui .markdown li,
        .swagger-wrapper .swagger-ui .renderedMarkdown p,
        .swagger-wrapper .swagger-ui .renderedMarkdown li {
          color: #3b4151 !important;
        }
        .swagger-wrapper .swagger-ui input[type=text],
        .swagger-wrapper .swagger-ui select,
        .swagger-wrapper .swagger-ui textarea {
          background-color: #ffffff !important;
          color: #3b4151 !important;
          border: 1px solid #d9d9d9 !important;
        }
        .swagger-wrapper .swagger-ui .opblock-body pre.microlight {
          background-color: #1e1e1e !important;
          color: #f8f8f2 !important;
          padding: 15px;
          border-radius: 4px;
        }
        .swagger-wrapper .swagger-ui .opblock-body pre.microlight * {
          color: inherit !important;
        }
        .swagger-wrapper .swagger-ui .scheme-container {
          background-color: #f7f7f7 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
        }
      `}</style>

      {/* Header bar */}
      <header style={{
        backgroundColor: '#1b1b1b',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '4px solid #89bf04',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: '#f3f4f6' }}>
            Pause Normalizer API
          </h1>
          <span style={{
            fontSize: '0.75rem',
            backgroundColor: '#89bf04',
            color: '#1b1b1b',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
            letterSpacing: '0.5px'
          }}>API DOCS</span>
        </div>
        <Link 
          href="/" 
          style={{
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            padding: '6px 14px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.3)',
            transition: 'all 0.2s',
            backgroundColor: 'rgba(255,255,255,0.05)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor = '#89bf04';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
        >
          ← Back to App
        </Link>
      </header>

      {/* Main container */}
      <main style={{ padding: '20px 0' }}>
        <div id="swagger-ui" />
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: '#666',
        fontSize: '0.85rem',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        marginTop: '40px'
      }}>
        Pause Normalizer API documentation generated using OpenAPI 3.0 & Swagger UI
      </footer>
    </div>
  );
}
