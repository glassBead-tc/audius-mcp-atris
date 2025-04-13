/**
 * Stream Transport Utilities
 * 
 * This file contains utilities for handling MCP server transport via streams.
 * It provides functionality for stream-based communication between clients and servers.
 */

import { Readable, PassThrough } from 'stream';
import { AudiusMcpError } from './helpers/error.js';

/**
 * Converts a Web API ReadableStream to a Node.js Readable stream
 * 
 * @param webStream The Web API ReadableStream to convert
 * @returns A Node.js Readable stream
 */
export function webStreamToNodeStream(webStream: ReadableStream): NodeJS.ReadableStream {
  // Check if native conversion is available (Node.js v16.5.0+)
  if (typeof (Readable as any).fromWeb === 'function') {
    return (Readable as any).fromWeb(webStream);
  }

  // Fallback for older Node.js versions
  const nodeStream = new PassThrough();
  
  const reader = webStream.getReader();
  
  function read() {
    reader.read().then(
      ({ value, done }) => {
        if (done) {
          nodeStream.end();
          return;
        }
        
        nodeStream.write(value);
        read();
      },
      error => {
        nodeStream.destroy(new Error(`Error reading web stream: ${error.message}`));
      }
    );
  }
  
  read();
  
  return nodeStream;
}

/**
 * Converts a Node.js Readable stream to a Web API ReadableStream
 * 
 * @param nodeStream The Node.js Readable stream to convert
 * @returns A Web API ReadableStream
 */
export function nodeStreamToWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream {
  // Check if native conversion is available (Node.js v16.5.0+)
  if (typeof (Readable as any).toWeb === 'function') {
    return (Readable as any).toWeb(nodeStream);
  }
  
  // Fallback for older Node.js versions
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', chunk => {
        controller.enqueue(chunk);
      });
      
      nodeStream.on('end', () => {
        controller.close();
      });
      
      nodeStream.on('error', err => {
        controller.error(err);
      });
    },
    
    cancel() {
      // Use type assertion to access Node.js specific methods
      const stream = nodeStream as unknown as {
        destroy?: () => void;
        close?: () => void;
      };
      
      if (stream.destroy) {
        stream.destroy();
      } else if (stream.close) {
        stream.close();
      }
    }
  });
}

/**
 * Creates a limited stream that will only transfer a specified amount of data
 * 
 * @param sourceStream The source stream to limit
 * @param maxBytes Maximum number of bytes to transfer
 * @returns A new stream limited to the specified number of bytes
 */
export function createLimitedStream(
  sourceStream: NodeJS.ReadableStream,
  maxBytes: number
): NodeJS.ReadableStream {
  const limitedStream = new PassThrough();
  let bytesRead = 0;
  
  sourceStream.on('data', (chunk) => {
    bytesRead += chunk.length;
    
    if (bytesRead <= maxBytes) {
      limitedStream.write(chunk);
    } else {
      // Write only the remaining bytes to reach the limit
      const remainingBytes = maxBytes - (bytesRead - chunk.length);
      if (remainingBytes > 0) {
        limitedStream.write(chunk.slice(0, remainingBytes));
      }
      
      limitedStream.end();
      // Attempt to destroy the source stream if possible
      const stream = sourceStream as unknown as { destroy?: () => void };
      if (typeof stream.destroy === 'function') {
        stream.destroy();
      }
    }
  });
  
  sourceStream.on('end', () => {
    limitedStream.end();
  });
  
  sourceStream.on('error', (err) => {
    limitedStream.destroy(new AudiusMcpError(`Stream error: ${err.message}`));
  });
  
  return limitedStream;
}

/**
 * Creates a throttled stream that limits the transfer rate
 * 
 * @param sourceStream The source stream to throttle
 * @param bytesPerSecond Maximum bytes per second to transfer
 * @returns A new throttled stream
 */
export function createThrottledStream(
  sourceStream: NodeJS.ReadableStream,
  bytesPerSecond: number
): NodeJS.ReadableStream {
  const throttledStream = new PassThrough();
  let paused = false;
  
  sourceStream.on('data', (chunk) => {
    if (!paused) {
      paused = true;
      throttledStream.write(chunk);
      
      // Calculate delay based on chunk size and desired transfer rate
      const delayMs = (chunk.length / bytesPerSecond) * 1000;
      
      setTimeout(() => {
        paused = false;
        sourceStream.resume();
      }, delayMs);
      
      sourceStream.pause();
    }
  });
  
  sourceStream.on('end', () => {
    throttledStream.end();
  });
  
  sourceStream.on('error', (err) => {
    throttledStream.destroy(new AudiusMcpError(`Stream error: ${err.message}`));
  });
  
  return throttledStream;
}