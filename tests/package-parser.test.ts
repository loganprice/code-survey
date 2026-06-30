import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parsePackageDependencies } from '../src/parser.ts';

test('Dependency Parser - parses all standard package dependency formats', async () => {
  const tempDir = path.resolve('./temp_dep_test');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // 1. mock package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: { lodash: '^4.17.21' },
        devDependencies: { typescript: '^5.0.0' }
      })
    );

    // 2. mock go.mod
    fs.writeFileSync(
      path.join(tempDir, 'go.mod'),
      `module myproject
      
go 1.20

require (
	github.com/gin-gonic/gin v1.9.0
	github.com/stretchr/testify v1.8.0
)
`
    );

    // 3. mock pom.xml
    fs.writeFileSync(
      path.join(tempDir, 'pom.xml'),
      `<project>
  <dependencies>
    <dependency>
      <groupId>org.apache.commons</groupId>
      <artifactId>commons-lang3</artifactId>
      <version>3.12.0</version>
    </dependency>
  </dependencies>
</project>`
    );

    // 4. mock csproj
    fs.writeFileSync(
      path.join(tempDir, 'App.csproj'),
      `<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
  </ItemGroup>
</Project>`
    );

    // 5. mock requirements.txt
    fs.writeFileSync(
      path.join(tempDir, 'requirements.txt'),
      `requests>=2.28.0\nnumpy==1.24.0\n`
    );

    const deps = parsePackageDependencies(tempDir);

    // Asserts
    assert.deepEqual(deps.npm, { lodash: '^4.17.21', typescript: '^5.0.0' });
    assert.deepEqual(deps.go, {
      'github.com/gin-gonic/gin': 'v1.9.0',
      'github.com/stretchr/testify': 'v1.8.0'
    });
    assert.deepEqual(deps.maven, { 'org.apache.commons:commons-lang3': '3.12.0' });
    assert.deepEqual(deps.nuget, { 'Newtonsoft.Json': '13.0.1' });
    assert.deepEqual(deps.pip, { requests: '>=2.28.0', numpy: '==1.24.0' });

  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});
