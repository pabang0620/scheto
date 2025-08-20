// Network Monitor to debug API calls
// This utility helps track and debug all network requests

class NetworkMonitor {
  constructor() {
    this.requests = [];
    this.enabled = false;
    this.originalFetch = window.fetch;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
  }

  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.installFetchInterceptor();
    this.installXHRInterceptor();
    
    console.log('%c🔍 Network Monitor Enabled', 'color: green; font-weight: bold');
    console.log('Monitoring all API calls...');
  }

  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;
    
    console.log('%c🔍 Network Monitor Disabled', 'color: red; font-weight: bold');
  }

  installFetchInterceptor() {
    const self = this;
    
    window.fetch = function(...args) {
      const url = args[0];
      const options = args[1] || {};
      const timestamp = new Date().toISOString();
      const requestId = Math.random().toString(36).substr(2, 9);
      
      // Log request
      const requestInfo = {
        id: requestId,
        type: 'fetch',
        url: url,
        method: options.method || 'GET',
        timestamp: timestamp,
        stack: new Error().stack
      };
      
      self.logRequest(requestInfo);
      
      // Call original fetch
      return self.originalFetch.apply(this, args)
        .then(response => {
          self.logResponse(requestId, response.status, response.statusText);
          return response;
        })
        .catch(error => {
          self.logError(requestId, error);
          throw error;
        });
    };
  }

  installXHRInterceptor() {
    const self = this;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._requestInfo = {
        method: method,
        url: url,
        timestamp: new Date().toISOString()
      };
      return self.originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      const requestId = Math.random().toString(36).substr(2, 9);
      
      if (this._requestInfo) {
        const requestInfo = {
          id: requestId,
          type: 'xhr',
          ...this._requestInfo,
          data: data,
          stack: new Error().stack
        };
        
        self.logRequest(requestInfo);
        
        this.addEventListener('load', function() {
          self.logResponse(requestId, this.status, this.statusText);
        });
        
        this.addEventListener('error', function() {
          self.logError(requestId, 'XHR Error');
        });
      }
      
      return self.originalXHRSend.apply(this, [data]);
    };
  }

  logRequest(info) {
    this.requests.push(info);
    
    // Special handling for schedule-related calls
    if (info.url && info.url.includes('/schedules')) {
      const isEmployeeSpecific = info.url.includes('/employees/');
      const color = isEmployeeSpecific ? 'green' : 'red';
      const emoji = isEmployeeSpecific ? '✅' : '❌';
      const type = isEmployeeSpecific ? 'CORRECT (Employee-specific)' : 'WRONG (All schedules)';
      
      console.group(`%c${emoji} Schedule API Call - ${type}`, `color: ${color}; font-weight: bold`);
      console.log('URL:', info.url);
      console.log('Method:', info.method);
      console.log('Timestamp:', info.timestamp);
      console.log('Request ID:', info.id);
      
      // Parse and log the employee ID if present
      const employeeMatch = info.url.match(/\/employees\/(\d+)\/schedules/);
      if (employeeMatch) {
        console.log('Employee ID:', employeeMatch[1]);
      }
      
      // Parse and log query parameters
      const urlObj = new URL(info.url, window.location.origin);
      if (urlObj.searchParams.toString()) {
        console.log('Query Parameters:');
        for (const [key, value] of urlObj.searchParams) {
          console.log(`  ${key}:`, value);
        }
      }
      
      console.log('Call Stack:', info.stack);
      console.groupEnd();
    } else {
      console.log(`%c📡 API Call`, 'color: blue', info.url);
    }
  }

  logResponse(requestId, status, statusText) {
    const request = this.requests.find(r => r.id === requestId);
    if (request) {
      request.response = {
        status: status,
        statusText: statusText,
        timestamp: new Date().toISOString()
      };
      
      if (request.url && request.url.includes('/schedules')) {
        const color = status >= 200 && status < 300 ? 'green' : 'red';
        console.log(`%c  └─ Response: ${status} ${statusText}`, `color: ${color}`);
      }
    }
  }

  logError(requestId, error) {
    const request = this.requests.find(r => r.id === requestId);
    if (request) {
      request.error = error;
      console.error(`%c  └─ Error:`, 'color: red', error);
    }
  }

  getScheduleCalls() {
    return this.requests.filter(r => r.url && r.url.includes('/schedules'));
  }

  getWrongScheduleCalls() {
    return this.getScheduleCalls().filter(r => !r.url.includes('/employees/'));
  }

  printSummary() {
    const scheduleCalls = this.getScheduleCalls();
    const wrongCalls = this.getWrongScheduleCalls();
    
    console.group('%c📊 Network Monitor Summary', 'background: #333; color: white; padding: 2px 5px; border-radius: 3px');
    console.log('Total API Calls:', this.requests.length);
    console.log('Schedule-related Calls:', scheduleCalls.length);
    console.log('Wrong Schedule Calls (not employee-specific):', wrongCalls.length);
    
    if (wrongCalls.length > 0) {
      console.group('%c❌ Wrong Schedule Calls Details', 'color: red; font-weight: bold');
      wrongCalls.forEach((call, index) => {
        console.group(`Call #${index + 1}`);
        console.log('URL:', call.url);
        console.log('Timestamp:', call.timestamp);
        console.log('Stack Trace:', call.stack);
        console.groupEnd();
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  clear() {
    this.requests = [];
    console.log('%c🧹 Network Monitor Cleared', 'color: orange');
  }
}

// Create a global instance
window.networkMonitor = new NetworkMonitor();

// Auto-enable in development
if (process.env.NODE_ENV === 'development') {
  window.networkMonitor.enable();
  
  // Add keyboard shortcut to print summary (Ctrl+Shift+N)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'N') {
      window.networkMonitor.printSummary();
    }
  });
  
  console.log('%c💡 Tip: Press Ctrl+Shift+N to see network summary', 'color: #666');
}

export default window.networkMonitor;