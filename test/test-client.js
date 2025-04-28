#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
// Use the transport without explicitly referring to ClientTransport interface
var child_process_1 = require("child_process");
var path_1 = require("path");
var url_1 = require("url");
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
var serverPath = path_1.default.join(__dirname, '..', 'build', 'debug.js');
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var serverProcess, transport, client, toolsResponse, searchResult, error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Starting test client...');
                    serverProcess = (0, child_process_1.spawn)('node', [serverPath], {
                        stdio: ['pipe', 'pipe', 'inherit'],
                        env: process.env,
                    });
                    // Wait for a moment to ensure the server is started
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 1:
                    // Wait for a moment to ensure the server is started
                    _a.sent();
                    console.log('Creating client transport...');
                    transport = new stdio_js_1.StdioClientTransport({
                        command: 'node',
                        args: [serverPath],
                        env: process.env,
                        // stderr: 'inherit' is the default, so we don't need to specify it
                    });
                    console.log('Creating client...');
                    client = new index_js_1.Client(transport);
                    console.log('Starting transport...');
                    // The StdioClientTransport needs to be started
                    return [4 /*yield*/, transport.start()];
                case 2:
                    // The StdioClientTransport needs to be started
                    _a.sent();
                    console.log('Connecting to server...');
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 9, 10, 12]);
                    console.log('Connected successfully!');
                    // List available tools
                    console.log('Getting list of tools...');
                    return [4 /*yield*/, client.request({
                            method: 'list_tools',
                            params: {}
                        })];
                case 4:
                    toolsResponse = _a.sent();
                    console.log('Available tools:', JSON.stringify(toolsResponse, null, 2));
                    // Test search-tracks tool
                    console.log('\nTesting search-tracks tool...');
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, client.request({
                            method: 'call_tool',
                            params: {
                                name: 'search-tracks',
                                arguments: {
                                    query: 'test',
                                    limit: 3
                                }
                            }
                        })];
                case 6:
                    searchResult = _a.sent();
                    console.log('Search tracks result:', JSON.stringify(searchResult, null, 2));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error('Error testing search-tracks:', error_1);
                    return [3 /*break*/, 8];
                case 8: return [3 /*break*/, 12];
                case 9:
                    error_2 = _a.sent();
                    console.error('Error:', error_2);
                    return [3 /*break*/, 12];
                case 10:
                    console.log('Closing connection...');
                    return [4 /*yield*/, client.close()];
                case 11:
                    _a.sent();
                    console.log('Terminating server process...');
                    serverProcess.kill();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('Fatal error:', error);
    process.exit(1);
});
