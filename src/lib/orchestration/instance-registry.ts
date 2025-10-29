/**
 * Instance Registry
 * Manages multiple Supabase instances
 */

import type { DokployApplication } from "../../types/dokploy.js";

export interface InstanceInfo {
  id: string;
  name: string;
  environment: "dev" | "staging" | "production";
  url: string;
  status: string;
  tags?: string[];
}

export class InstanceRegistry {
  private instances: Map<string, InstanceInfo> = new Map();

  register(instance: InstanceInfo): void {
    this.instances.set(instance.id, instance);
  }

  list(filter?: { environment?: string; tags?: string[] }): InstanceInfo[] {
    let instances = Array.from(this.instances.values());

    if (filter?.environment) {
      instances = instances.filter((i) => i.environment === filter.environment);
    }

    if (filter?.tags) {
      instances = instances.filter((i) =>
        filter.tags?.some((tag) => i.tags?.includes(tag))
      );
    }

    return instances;
  }

  get(id: string): InstanceInfo | undefined {
    return this.instances.get(id);
  }
}
