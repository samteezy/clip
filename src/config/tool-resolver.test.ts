import { describe, it, expect } from "vitest";
import { ToolConfigResolver } from "./tool-resolver.js";
import { createTestConfig, createTestCompressionConfig } from "../test/helpers.js";
import type { UpstreamServerConfig } from "../types.js";

describe("ToolConfigResolver - Parameter Hiding and Overrides", () => {
  it("should return empty array when no hideParameters configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const hidden = resolver.getHiddenParameters("test__mytool");
    expect(hidden).toEqual([]);
  });

  it("should return configured hidden parameters", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          fetch: {
            hideParameters: ["max_length"],
            parameterOverrides: { max_length: 50000 },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const hidden = resolver.getHiddenParameters("test__fetch");
    expect(hidden).toEqual(["max_length"]);
  });

  it("should return empty object when no overrides configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const overrides = resolver.getParameterOverrides("test__mytool");
    expect(overrides).toEqual({});
  });

  it("should return configured parameter overrides", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          fetch: {
            parameterOverrides: { max_length: 50000 },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const overrides = resolver.getParameterOverrides("test__fetch");
    expect(overrides).toEqual({ max_length: 50000 });
  });

  it("should handle multiple hidden parameters", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          api: {
            hideParameters: ["timeout", "retry_count"],
            parameterOverrides: { timeout: 30, retry_count: 3 },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const hidden = resolver.getHiddenParameters("test__api");
    expect(hidden).toEqual(["timeout", "retry_count"]);
  });

  it("should handle complex parameter override values", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          api: {
            parameterOverrides: {
              headers: { "User-Agent": "MCPCP/1.0" },
              exclude_dirs: [".git", "node_modules"],
              timeout: 30,
              enabled: true,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const overrides = resolver.getParameterOverrides("test__api");
    expect(overrides).toEqual({
      headers: { "User-Agent": "MCPCP/1.0" },
      exclude_dirs: [".git", "node_modules"],
      timeout: 30,
      enabled: true,
    });
  });

  it("should return empty array for non-existent tool", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {},
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const hidden = resolver.getHiddenParameters("test__nonexistent");
    expect(hidden).toEqual([]);
  });

  it("should return empty object for non-existent tool", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {},
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const overrides = resolver.getParameterOverrides("test__nonexistent");
    expect(overrides).toEqual({});
  });

  it("should handle multiple upstreams with different configs", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "upstream1",
        name: "Upstream 1",
        transport: "stdio",
        command: "echo",
        tools: {
          fetch: {
            hideParameters: ["max_length"],
            parameterOverrides: { max_length: 50000 },
          },
        },
      },
      {
        id: "upstream2",
        name: "Upstream 2",
        transport: "stdio",
        command: "echo",
        tools: {
          search: {
            hideParameters: ["limit"],
            parameterOverrides: { limit: 100 },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    expect(resolver.getHiddenParameters("upstream1__fetch")).toEqual([
      "max_length",
    ]);
    expect(resolver.getParameterOverrides("upstream1__fetch")).toEqual({
      max_length: 50000,
    });

    expect(resolver.getHiddenParameters("upstream2__search")).toEqual(["limit"]);
    expect(resolver.getParameterOverrides("upstream2__search")).toEqual({
      limit: 100,
    });
  });
});

describe("ToolConfigResolver - Compression Policy Resolution", () => {
  it("should return global default policy when no overrides", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.enabled).toBe(true);
    expect(policy.tokenThreshold).toBe(1000);
  });

  it("should use tool-level compression override", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            compression: {
              enabled: false,
              tokenThreshold: 500,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.enabled).toBe(false);
    expect(policy.tokenThreshold).toBe(500);
  });

  it("should merge tool compression with global defaults", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            compression: {
              tokenThreshold: 2000, // Override threshold only
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From global default
    expect(policy.tokenThreshold).toBe(2000); // From tool override
  });

  it("should handle maxOutputTokens override", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            compression: {
              maxOutputTokens: 250,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.maxOutputTokens).toBe(250);
  });

  it("should handle customInstructions", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            compression: {
              customInstructions: "Focus on errors",
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.customInstructions).toBe("Focus on errors");
  });
});

describe("ToolConfigResolver - Masking Policy Resolution", () => {
  it("should return default when no masking configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    // No masking config
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveMaskingPolicy("test__mytool");
    expect(policy.enabled).toBe(false); // Default when no config
  });

  it("should use global masking policy", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.masking = {
      enabled: true,
      llmConfig: {
        baseUrl: "http://localhost:8080/v1",
        model: "test",
      },
    };
    config.defaults = {
      ...config.defaults,
      masking: {
        enabled: true,
        piiTypes: ["email", "ssn"],
        llmFallback: false,
        llmFallbackThreshold: "low",
      },
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveMaskingPolicy("test__mytool");
    expect(policy.enabled).toBe(true);
    expect(policy.piiTypes).toEqual(["email", "ssn"]);
  });

  it("should use tool-level masking override", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            masking: {
              enabled: false,
            },
          },
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.masking = {
      enabled: true,
    };
    config.defaults = config.defaults || {};
    config.defaults.masking = {
      enabled: true,
      piiTypes: ["email"],
      llmFallback: false,
      llmFallbackThreshold: "low",
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveMaskingPolicy("test__mytool");
    expect(policy.enabled).toBe(false);
  });

  it("should merge tool masking with global defaults", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            masking: {
              piiTypes: ["phone"], // Override only piiTypes
            },
          },
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.masking = {
      enabled: true,
      llmConfig: {
        baseUrl: "http://localhost:8080/v1",
        model: "test",
      },
    };
    config.defaults = {
      ...config.defaults,
      masking: {
        enabled: true,
        piiTypes: ["email", "ssn"],
        llmFallback: true,
        llmFallbackThreshold: "medium",
      },
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveMaskingPolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From global
    expect(policy.piiTypes).toEqual(["phone"]); // From tool override
    expect(policy.llmFallback).toBe(true); // From global
  });
});

describe("ToolConfigResolver - Tool Visibility", () => {
  it("should return false when tool not hidden", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: { hidden: false },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    expect(resolver.isToolHidden("test__mytool")).toBe(false);
  });

  it("should return true when tool is hidden", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          dangerous_tool: { hidden: true },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    expect(resolver.isToolHidden("test__dangerous_tool")).toBe(true);
  });

  it("should return false for non-existent tool", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {},
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    expect(resolver.isToolHidden("test__nonexistent")).toBe(false);
  });
});

describe("ToolConfigResolver - Description Override", () => {
  it("should return undefined when no override", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    expect(resolver.getDescriptionOverride("test__mytool")).toBeUndefined();
  });

  it("should return custom description when configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          fetch: {
            overwriteDescription: "Custom fetch description",
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    expect(resolver.getDescriptionOverride("test__fetch")).toBe(
      "Custom fetch description"
    );
  });
});

describe("ToolConfigResolver - Cache Config (via getToolConfig)", () => {
  it("should return undefined when no cache configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const config = resolver.getToolConfig("test__mytool");
    expect(config?.cache).toBeUndefined();
  });

  it("should return custom cache config when configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            cache: {
              ttlSeconds: 300,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const config = resolver.getToolConfig("test__mytool");
    expect(config?.cache?.ttlSeconds).toBe(300);
  });

  it("should handle disabled cache", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          realtime_tool: {
            cache: {
              enabled: false,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const config = resolver.getToolConfig("test__realtime_tool");
    expect(config?.cache?.enabled).toBe(false);
  });
});

describe("ToolConfigResolver - Retry Escalation", () => {
  it("should return retry escalation config from global", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.compression.retryEscalation = {
      enabled: true,
      windowSeconds: 120,
      tokenMultiplier: 3,
    };
    const resolver = new ToolConfigResolver(config);

    const retryConfig = resolver.getRetryEscalation();
    expect(retryConfig?.enabled).toBe(true);
    expect(retryConfig?.windowSeconds).toBe(120);
    expect(retryConfig?.tokenMultiplier).toBe(3);
  });

  it("should return undefined when not configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {},
      },
    ];
    const config = createTestConfig({
      upstreams,
      compression: {
        ...createTestCompressionConfig(),
        retryEscalation: undefined // No retryEscalation config
      }
    });
    const resolver = new ToolConfigResolver(config);

    expect(resolver.getRetryEscalation()).toBeUndefined();
  });
});

describe("ToolConfigResolver - Goal Aware", () => {
  it("should return global goalAware setting by default", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.defaults = config.defaults || {};
    config.defaults.compression = config.defaults.compression || {};
    config.defaults.compression.goalAware = true;
    const resolver = new ToolConfigResolver(config);

    expect(resolver.isGoalAwareEnabled("test__mytool")).toBe(true);
  });

  it("should use tool-level goalAware override", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            compression: {
              goalAware: false,
            },
          },
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.defaults = config.defaults || {};
    config.defaults.compression = config.defaults.compression || {};
    config.defaults.compression.goalAware = true;
    const resolver = new ToolConfigResolver(config);

    expect(resolver.isGoalAwareEnabled("test__mytool")).toBe(false);
  });
});

describe("ToolConfigResolver - Bypass Enabled", () => {
  it("should return global bypass setting", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {},
      },
    ];
    const config = createTestConfig({ upstreams });
    config.compression.bypassEnabled = true;
    const resolver = new ToolConfigResolver(config);

    expect(resolver.isBypassEnabled()).toBe(true);
  });

  it("should return false when not configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {},
      },
    ];
    const config = createTestConfig({ upstreams });
    config.compression.bypassEnabled = false;
    const resolver = new ToolConfigResolver(config);

    expect(resolver.isBypassEnabled()).toBe(false);
  });
});

describe("ToolConfigResolver - Upstream-Level Compression Defaults", () => {
  it("should use upstream defaults.compression when configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          compression: {
            enabled: false,
            tokenThreshold: 2000,
            maxOutputTokens: 500,
          },
        },
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.enabled).toBe(false); // From upstream defaults
    expect(policy.tokenThreshold).toBe(2000); // From upstream defaults
    expect(policy.maxOutputTokens).toBe(500); // From upstream defaults
  });

  it("should merge upstream defaults with global defaults", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          compression: {
            tokenThreshold: 3000, // Override threshold only
          },
        },
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    // Global defaults: enabled: true, tokenThreshold: 1000
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From global default
    expect(policy.tokenThreshold).toBe(3000); // From upstream default
  });

  it("should allow tool-level to override upstream defaults", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          compression: {
            enabled: false,
            tokenThreshold: 2000,
          },
        },
        tools: {
          mytool: {
            compression: {
              enabled: true, // Tool overrides upstream
              tokenThreshold: 5000, // Tool overrides upstream
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCompressionPolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From tool override
    expect(policy.tokenThreshold).toBe(5000); // From tool override
  });

  it("should verify three-level hierarchy: global → upstream → tool", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          compression: {
            tokenThreshold: 3000, // Upstream level
          },
        },
        tools: {
          tool1: {}, // Uses upstream default (3000)
          tool2: {
            compression: {
              tokenThreshold: 5000, // Tool level
            },
          },
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    if (config.defaults.compression) {
      config.defaults.compression.tokenThreshold = 1000; // Global level
    }
    const resolver = new ToolConfigResolver(config);

    const policy1 = resolver.resolveCompressionPolicy("test__tool1");
    expect(policy1.tokenThreshold).toBe(3000); // Upstream wins over global

    const policy2 = resolver.resolveCompressionPolicy("test__tool2");
    expect(policy2.tokenThreshold).toBe(5000); // Tool wins over upstream
  });
});

describe("ToolConfigResolver - Upstream-Level Masking Defaults", () => {
  it("should use upstream defaults.masking when configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          masking: {
            enabled: true,
            piiTypes: ["phone"],
            llmFallback: true,
            llmFallbackThreshold: "high",
          },
        },
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.masking = {
      enabled: true,
      llmConfig: { baseUrl: "http://localhost", model: "test" },
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveMaskingPolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From upstream defaults
    expect(policy.piiTypes).toEqual(["phone"]); // From upstream defaults
    expect(policy.llmFallback).toBe(true); // From upstream defaults
    expect(policy.llmFallbackThreshold).toBe("high"); // From upstream defaults
  });

  it("should merge upstream masking defaults with global defaults", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          masking: {
            piiTypes: ["phone", "ssn"], // Override piiTypes only
          },
        },
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.masking = {
      enabled: true,
      llmConfig: { baseUrl: "http://localhost", model: "test" },
    };
    config.defaults.masking = {
      enabled: true,
      piiTypes: ["email", "credit_card", "ssn", "phone", "ip_address"],
      llmFallback: false,
      llmFallbackThreshold: "low",
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveMaskingPolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From global default
    expect(policy.piiTypes).toEqual(["phone", "ssn"]); // From upstream default
    expect(policy.llmFallback).toBe(false); // From global default
    expect(policy.llmFallbackThreshold).toBe("low"); // From global default
  });

  it("should allow tool-level to override upstream masking defaults", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          masking: {
            enabled: true,
            piiTypes: ["phone"],
          },
        },
        tools: {
          mytool: {
            masking: {
              enabled: false, // Tool overrides upstream
              piiTypes: ["email"], // Tool overrides upstream
            },
          },
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.masking = {
      enabled: true,
      llmConfig: { baseUrl: "http://localhost", model: "test" },
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveMaskingPolicy("test__mytool");
    expect(policy.enabled).toBe(false); // From tool override
    expect(policy.piiTypes).toEqual(["email"]); // From tool override
  });

  it("should verify three-level hierarchy: global → upstream → tool", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          masking: {
            piiTypes: ["phone", "ssn"], // Upstream level
          },
        },
        tools: {
          tool1: {}, // Uses upstream default
          tool2: {
            masking: {
              piiTypes: ["email"], // Tool level
            },
          },
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.masking = {
      enabled: true,
      llmConfig: { baseUrl: "http://localhost", model: "test" },
    };
    config.defaults.masking = {
      enabled: true,
      piiTypes: ["email", "credit_card", "ssn", "phone", "ip_address"], // Global level
      llmFallback: false,
      llmFallbackThreshold: "low",
    };
    const resolver = new ToolConfigResolver(config);

    const policy1 = resolver.resolveMaskingPolicy("test__tool1");
    expect(policy1.piiTypes).toEqual(["phone", "ssn"]); // Upstream wins over global

    const policy2 = resolver.resolveMaskingPolicy("test__tool2");
    expect(policy2.piiTypes).toEqual(["email"]); // Tool wins over upstream
  });
});

describe("ToolConfigResolver - Cache Policy Resolution", () => {
  it("should return defaults when no cache config", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCachePolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From createTestConfig defaults
    expect(policy.ttlSeconds).toBe(60); // From createTestConfig defaults
  });

  it("should use global defaults.cache when configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.defaults.cache = {
      enabled: false,
      ttlSeconds: 600,
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveCachePolicy("test__mytool");
    expect(policy.enabled).toBe(false); // From global defaults
    expect(policy.ttlSeconds).toBe(600); // From global defaults
  });

  it("should use upstream defaults.cache when configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          cache: {
            enabled: false,
            ttlSeconds: 900,
          },
        },
        tools: {
          mytool: {},
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCachePolicy("test__mytool");
    expect(policy.enabled).toBe(false); // From upstream defaults
    expect(policy.ttlSeconds).toBe(900); // From upstream defaults
  });

  it("should use tool-level cache when configured", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            cache: {
              enabled: false,
              ttlSeconds: 120,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCachePolicy("test__mytool");
    expect(policy.enabled).toBe(false); // From tool override
    expect(policy.ttlSeconds).toBe(120); // From tool override
  });

  it("should merge upstream cache defaults with global defaults", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          cache: {
            ttlSeconds: 1200, // Override ttlSeconds only
          },
        },
        tools: {
          mytool: {},
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.defaults.cache = {
      enabled: false, // Global
      ttlSeconds: 300, // Will be overridden
    };
    const resolver = new ToolConfigResolver(config);

    const policy = resolver.resolveCachePolicy("test__mytool");
    expect(policy.enabled).toBe(false); // From global default
    expect(policy.ttlSeconds).toBe(1200); // From upstream default
  });

  it("should allow partial tool-level overrides", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          cache: {
            enabled: true,
            ttlSeconds: 600,
          },
        },
        tools: {
          mytool: {
            cache: {
              ttlSeconds: 180, // Override ttlSeconds only
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCachePolicy("test__mytool");
    expect(policy.enabled).toBe(true); // From upstream default
    expect(policy.ttlSeconds).toBe(180); // From tool override
  });

  it("should verify three-level hierarchy: global → upstream → tool", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        defaults: {
          cache: {
            ttlSeconds: 900, // Upstream level
          },
        },
        tools: {
          tool1: {}, // Uses upstream default (900)
          tool2: {
            cache: {
              ttlSeconds: 60, // Tool level
            },
          },
        },
      },
    ];
    const config = createTestConfig({ upstreams });
    config.defaults.cache = {
      enabled: true,
      ttlSeconds: 300, // Global level
    };
    const resolver = new ToolConfigResolver(config);

    const policy1 = resolver.resolveCachePolicy("test__tool1");
    expect(policy1.ttlSeconds).toBe(900); // Upstream wins over global

    const policy2 = resolver.resolveCachePolicy("test__tool2");
    expect(policy2.ttlSeconds).toBe(60); // Tool wins over upstream
  });

  it("should return correct structure for ResolvedCachePolicy", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            cache: {
              enabled: false,
              ttlSeconds: 120,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCachePolicy("test__mytool");

    // Verify structure
    expect(policy).toHaveProperty("enabled");
    expect(policy).toHaveProperty("ttlSeconds");
    expect(typeof policy.enabled).toBe("boolean");
    expect(typeof policy.ttlSeconds).toBe("number");
  });

  it("should handle cache disabled case", () => {
    const upstreams: UpstreamServerConfig[] = [
      {
        id: "test",
        name: "Test",
        transport: "stdio",
        command: "echo",
        tools: {
          mytool: {
            cache: {
              enabled: false,
            },
          },
        },
      },
    ];
    const resolver = new ToolConfigResolver(createTestConfig({ upstreams }));

    const policy = resolver.resolveCachePolicy("test__mytool");
    expect(policy.enabled).toBe(false);
    expect(policy.ttlSeconds).toBeDefined(); // Should still have ttlSeconds from defaults
  });
});
