# Igne Documentation

Welcome to the Igne documentation! Igne is a fast, extensible knowledge base application with plugin support compatible with Obsidian.

## Documentation

### For Users

- **[Installation Guide](./installation.md)** - Get started with Igne
- **[User Manual](./user-guide.md)** - Learn how to use Igne
- **[Features](./features.md)** - Discover Igne's capabilities
- **[FAQ](./faq.md)** - Frequently asked questions

### For Plugin Developers

- **[Plugin Development Guide](./plugin-development.md)** - Create your first plugin
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Plugin Examples](../examples/)** - Sample plugins to learn from
- **[Plugin Compatibility](./PLUGIN_COMPATIBILITY.md)** - Check Obsidian plugin compatibility

### For Contributors

- **[Contributing Guide](./contributing.md)** - How to contribute to Igne
- **[Architecture](./architecture.md)** - Igne's architecture and design
- **[Development Guide](./development.md)** - Set up development environment
- **[Testing Guide](./testing.md)** - How to test Igne

## Quick Links

### Getting Started

1. **Install Igne**: See the [Installation Guide](./installation.md)
2. **Learn the Basics**: Read the [User Manual](./user-guide.md)
3. **Explore Plugins**: Check out [Plugin Development](./plugin-development.md)

### Plugin Development

1. **Your First Plugin**: Start with the [Plugin Development Guide](./plugin-development.md)
2. **API Reference**: Consult the [API Documentation](./api-reference.md)
3. **Examples**: Browse [example plugins](../examples/)

### Performance & Testing

1. **Performance Benchmarks**: See [Performance Targets](../tests/performance/)
2. **E2E Tests**: Check out [E2E testing](../tests/e2e/)
3. **Compatibility**: View [Plugin Compatibility Matrix](./PLUGIN_COMPATIBILITY.md)

## Key Features

- **Fast & Lightweight**: Built with Rust backend and React frontend
- **Plugin System**: Compatible with Obsidian plugin API
- **Wikilinks**: Full support for `[[wikilinks]]`
- **Search**: Powerful full-text search
- **Markdown**: Complete Markdown support with live preview
- **Backlinks**: See all backlinks to your notes
- **Tags**: Organize with tags
- **Customizable**: Extensible with plugins and themes

## Documentation Structure

```
docs/
├── installation.md          # Installation instructions
├── user-guide.md            # User manual
├── features.md              # Feature overview
├── faq.md                   # Frequently asked questions
├── plugin-development.md    # Plugin development guide
├── api-reference.md         # API documentation
├── PLUGIN_COMPATIBILITY.md  # Plugin compatibility matrix
├── contributing.md          # Contributing guide
├── architecture.md          # Architecture documentation
├── development.md           # Development guide
└── testing.md               # Testing guide

examples/
├── hello-world-plugin.ts    # Simple example plugin
├── word-counter-plugin.ts   # Word counter example
└── daily-note-plugin.ts     # Daily note example
```

## Community

- **GitHub**: https://github.com/zereraz/igne
- **Issues**: https://github.com/zereraz/igne/issues
- **Discussions**: https://github.com/zereraz/igne/discussions

## License

MIT License - see LICENSE file for details
