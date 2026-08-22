"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check } from "lucide-react"

function ConfigBlock({ title, code, path }: { title: string; code: string; path?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium text-text-primary">{title}</p>
          {path && <p className="text-[10px] text-text-muted">{path}</p>}
        </div>
        <button type="button" onClick={handleCopy} className="copy-btn">
          {copied ? (
            <><Check className="h-3 w-3 text-signal-success" /><span className="text-signal-success">Copied</span></>
          ) : (
            <><Copy className="h-3 w-3" /> Copy</>
          )}
        </button>
      </div>
      <pre className="max-h-[280px] overflow-auto rounded-md border border-border-default bg-base/60 p-3 text-[11px] leading-relaxed text-text-primary/80">
        <code className="mono">{code}</code>
      </pre>
    </div>
  )
}

export function InstallationHelp({ domains }: { domains: string[] }) {
  const primaryDomain = domains[0] || "yourdomain.com"
  const certPath = `/etc/letsencrypt/live/${primaryDomain}`

  return (
    <div className="panel glass-reflection p-5">
      <div className="mb-4">
        <span className="mono text-[9px] font-semibold tracking-[0.12em] text-text-muted uppercase">INSTALLATION</span>
        <h2 className="mt-1 text-[13px] font-semibold text-text-primary">
          Need help installing your certificate?
        </h2>
      </div>

      <Tabs defaultValue="nginx" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-4 bg-base/40 sm:grid-cols-7">
          <TabsTrigger value="nginx" className="text-[10px] font-medium">Nginx</TabsTrigger>
          <TabsTrigger value="apache" className="text-[10px] font-medium">Apache</TabsTrigger>
          <TabsTrigger value="cpanel" className="text-[10px] font-medium">cPanel</TabsTrigger>
          <TabsTrigger value="docker" className="text-[10px] font-medium">Docker</TabsTrigger>
          <TabsTrigger value="kubernetes" className="text-[10px] font-medium">K8s</TabsTrigger>
          <TabsTrigger value="haproxy" className="text-[10px] font-medium">HAProxy</TabsTrigger>
          <TabsTrigger value="traefik" className="text-[10px] font-medium">Traefik</TabsTrigger>
        </TabsList>

        <TabsContent value="nginx" className="space-y-3">
          <ConfigBlock
            title="Nginx SSL Configuration"
            path="/etc/nginx/conf.d/ssl.conf"
            code={`server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${primaryDomain};

    ssl_certificate     ${certPath}/fullchain.pem;
    ssl_certificate_key ${certPath}/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
          />
          <ConfigBlock
            title="HTTP to HTTPS Redirect"
            path="/etc/nginx/conf.d/redirect.conf"
            code={`server {
    listen 80;
    listen [::]:80;
    server_name ${primaryDomain};
    return 301 https://$host$request_uri;
}`}
          />
          <ConfigBlock title="Test & Reload" code="nginx -t && systemctl reload nginx" />
        </TabsContent>

        <TabsContent value="apache" className="space-y-3">
          <ConfigBlock
            title="Apache SSL Virtual Host"
            path="/etc/apache2/sites-available/ssl.conf"
            code={`<VirtualHost *:443>
    ServerName ${primaryDomain}
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile    ${certPath}/cert.pem
    SSLCertificateKeyFile ${certPath}/privkey.pem
    SSLCertificateChainFile ${certPath}/chain.pem

    SSLProtocol -all +TLSv1.2 +TLSv1.3
    SSLCipherSuite HIGH:!aNULL:!MD5

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>`}
          />
          <ConfigBlock
            title="Enable Modules & Restart"
            code={`a2enmod ssl\na2ensite ssl.conf\nsystemctl restart apache2`}
          />
        </TabsContent>

        <TabsContent value="cpanel" className="space-y-3">
          <div className="space-y-2 rounded-md border border-border-subtle bg-base/40 p-3.5">
            <ol className="list-inside list-decimal space-y-1.5 text-[12px] text-text-secondary">
              <li>Open <strong className="text-text-primary">cPanel</strong> and go to <strong className="text-text-primary">SSL/TLS</strong></li>
              <li>Click <strong className="text-text-primary">Manage SSL Hosts</strong></li>
              <li>Select your domain from the dropdown</li>
              <li>Paste <strong className="text-text-primary">cert.pem</strong> into the Certificate field</li>
              <li>Paste <strong className="text-text-primary">privkey.pem</strong> into the Private Key field</li>
              <li>Paste <strong className="text-text-primary">chain.pem</strong> into the Certificate Authority Bundle field</li>
              <li>Click <strong className="text-text-primary">Install Certificate</strong></li>
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="docker" className="space-y-3">
          <ConfigBlock
            title="Docker Compose with SSL"
            path="docker-compose.yml"
            code={`services:\n  nginx:\n    image: nginx:alpine\n    ports:\n      - "443:443"\n      - "80:80"\n    volumes:\n      - ${certPath}/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro\n      - ${certPath}/privkey.pem:/etc/ssl/private/privkey.pem:ro\n      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro\n    restart: unless-stopped`}
          />
          <ConfigBlock
            title="Certbot DNS Challenge (Docker)"
            code={`docker run --rm \\\n  -v /etc/letsencrypt:/etc/letsencrypt \\\n  certbot/certbot certonly \\\n  --manual --preferred-challenges dns \\\n  --email your@email.com \\\n  -d ${primaryDomain}`}
          />
        </TabsContent>

        <TabsContent value="kubernetes" className="space-y-3">
          <ConfigBlock
            title="TLS Secret"
            code={`kubectl create secret tls ${primaryDomain.replace(/\./g, "-")}-tls \\\n  --cert=${certPath}/fullchain.pem \\\n  --key=${certPath}/privkey.pem \\\n  -n default`}
          />
          <ConfigBlock
            title="Ingress with TLS"
            path="ingress.yaml"
            code={`apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: ${primaryDomain.replace(/\./g, "-")}\nspec:\n  tls:\n  - hosts:\n    - ${primaryDomain}\n    secretName: ${primaryDomain.replace(/\./g, "-")}-tls\n  rules:\n  - host: ${primaryDomain}\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: your-service\n            port:\n              number: 80`}
          />
        </TabsContent>

        <TabsContent value="haproxy" className="space-y-3">
          <ConfigBlock
            title="HAProxy SSL"
            path="/etc/haproxy/haproxy.cfg"
            code={`global\n    ssl-default-bind-ciphers HIGH:!aNULL:!MD5\n    ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11\n\nfrontend https-in\n    bind *:443 ssl crt /etc/ssl/${primaryDomain}/combined.pem\n    default_backend servers\n\nfrontend http-in\n    bind *:80\n    http-request redirect scheme https\n\nbackend servers\n    server app1 127.0.0.1:3000 check`}
          />
          <ConfigBlock
            title="Combine Cert & Key"
            code={`cat ${certPath}/cert.pem ${certPath}/privkey.pem \\\n  > /etc/ssl/${primaryDomain}/combined.pem`}
          />
        </TabsContent>

        <TabsContent value="traefik" className="space-y-3">
          <ConfigBlock
            title="Traefik Static Cert"
            path="traefik.yml"
            code={`tls:\n  certificates:\n    - certFile: ${certPath}/cert.pem\n      keyFile: ${certPath}/privkey.pem\n\nhttp:\n  routers:\n    myrouter:\n      rule: "Host(\`${primaryDomain}\`)"\n      service: myservice\n      tls: {}\n  services:\n    myservice:\n      loadBalancer:\n        servers:\n          - url: "http://127.0.0.1:3000"`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
