export {};

declare global {
  interface Window {
    google: any;
  }

  namespace google {
    namespace maps {
      namespace places {
        class Autocomplete {
          constructor(inputField: HTMLInputElement, opts?: any);
          addListener(eventName: string, handler: () => void): void;
          getPlace(): { formatted_address?: string; name?: string } | undefined;
        }
      }

      namespace event {
        function clearInstanceListeners(instance: any): void;
      }
    }
  }
}
