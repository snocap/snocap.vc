// Registers the .html text loader (workers/html.mjs) for the test run. The hooks
// must live in a separate module from the register() call, so this file only
// wires them up; see html.mjs for the why.
import { register } from "node:module";

register("./html.mjs", import.meta.url);
