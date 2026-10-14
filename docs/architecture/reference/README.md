# C4-PlantUML

> 本目录为官方资料的整理与翻译，示例代码见各图类型子目录；一切以官方为准。

## Intro

C4 模型是由 Simon Brown 创建的一种用于可视化软件架构的方法，通过 `Context, Container, Component, Code` 四层抽象来描述软件系统的静态结构。C4-PlantUML 将 PlantUML 与 C4 模型的优势相结合，借助开源且跨平台的工具，以直观的语言提供一种简单方式来描述和沟通软件架构——尤其适用于前期设计阶段。

## Official website

- <https://github.com/plantuml-stdlib/C4-PlantUML>
- <https://c4model.com/>
- <https://plantuml.com/>

## Resources

- [介绍 C4 model 的文章](https://icepanel.io/blog/what-is-the-c4-model)
- [介绍 C4 model 的视频](https://www.youtube.com/watch?v=LGD9L8RA-To&list=PLSB-KXFy83UuxwNMcUMloPeZUjxaKVZIK)

## Demo

### Context diagram

**软件系统**

软件系统是最高层次的抽象，描述的是能为用户（无论是否为人）提供价值的事物。这包括你正在建模的软件系统，以及该系统所依赖的其他软件系统（或反过来依赖它的系统）。

遗憾的是，"软件系统"是 C4 模型抽象中最难定义的一个概念。这在一定程度上也是因为各组织对同一事物往往有自己的术语，常用"应用程序""产品""服务"等词汇来描述。一种理解方式是：软件系统是由单个软件开发团队负责构建、拥有、承担责任，并能查看其内部实现细节的事物。该系统的代码可能位于单一的源代码仓库中，团队中的任何成员都有权对其进行修改。在许多情况下，软件系统的边界会与单个团队的边界相对应；也可能是边界内的所有内容会同时部署。

**系统上下文图**

系统上下文图是绘制和文档化软件系统的良好起点，让你能够后退一步、看清整体大局。绘制时，将你的系统作为中心的一个方框，周围环绕着使用它的用户以及与之交互的其他系统。在此层级，细节并不重要，因为它是放大后的系统全景视图。重点应放在人员（参与者、角色、用户画像等）和软件系统上，而非技术、协议或其他低层次细节。这种图适合展示给非技术人员。

#### library

在 C4-PlantUML 的 **Context diagram**（System Context & System Landscape）层级，通过引入 `C4_Context.puml`（或标准库 `!include <C4/C4_Context>`）后，主要可用宏如下：

##### 人员相关

- **Person(alias, label, ?descr, ...)**：表示系统内部或范围内的人员/角色（如客户、管理员）。
- **Person_Ext(alias, label, ?descr, ...)**：表示系统外部的人员/角色。

##### 系统相关

- **System(alias, label, ?descr, ...)**：表示范围内的软件系统。
- **System_Ext(alias, label, ?descr, ...)**：表示外部依赖的软件系统。
- **SystemDb(alias, label, ?descr, ...)**：以数据库形状表示的系统（通常用于数据存储类系统）。
- **SystemDb_Ext(alias, label, ?descr, ...)**：以数据库形状表示的外部系统。
- **SystemQueue(alias, label, ?descr, ...)**：以队列形状表示的系统（通常用于消息队列类系统）。
- **SystemQueue_Ext(alias, label, ?descr, ...)**：以队列形状表示的外部系统。

##### 边界相关

- **System_Boundary(alias, label, ...)**：绘制系统边界，用于将相关系统分组。
- **Enterprise_Boundary(alias, label, ...)**：绘制企业/组织边界，常用于 System Landscape 图。
- **Boundary(alias, label, ...)**：通用边界，用于自定义分组。

##### 关系相关（通用，Context 中常用）

- **Rel(from, to, label, ?techn, ...)**：定义两个元素之间的单向关系。
- **BiRel(from, to, label, ...)**：定义双向关系。
- **Rel_U / Rel_D / Rel_L / Rel_R / Rel_Neighbor / Rel_Back** 等：带方向提示的关系宏，便于控制布局。

这些宏构成了 Context 层级的核心元素与关系表达能力，支持通过可选参数（描述、图标、标签、链接等）进行进一步定制。

#### 示例

- 英文：`context/bigbank-context.puml`
- 中文：`context/bigbank-context.zh.puml`

### Container diagram

**容器**

注意：不是 Docker！在 C4 模型中，容器表示一个应用程序或数据存储。容器是整体软件系统正常运行所必须启动的单元。实际上，容器可以是：

- 服务端 Web 应用程序：运行在 Apache Tomcat 上的 Java EE Web 应用、运行在 Microsoft IIS 上的 ASP.NET MVC 应用、运行在 WEBrick 上的 Ruby on Rails 应用、Node.js 应用等。
- 客户端 Web 应用程序：在浏览器中使用 Angular、Backbone.JS、jQuery 等运行的 JavaScript 应用。
- 客户端桌面应用程序：使用 WPF 编写的 Windows 桌面应用、使用 Objective-C 编写的 OS X 桌面应用、使用 JavaFX 编写的跨平台桌面应用等。
- 移动应用：Apple iOS 应用、Android 应用、Microsoft Windows Phone 应用等。
- 服务端控制台应用程序：独立应用程序（例如带 `public static void main` 的程序）、批处理进程等。
- 无服务器函数：单个无服务器函数（例如 Amazon Lambda、Azure Function 等）。
- 数据库：关系型数据库管理系统、文档存储、图数据库等中的模式或数据库，例如 MySQL、Microsoft SQL Server、Oracle Database、MongoDB、Riak、Cassandra、Neo4j 等。
- Blob 或内容存储：Blob 存储（例如 Amazon S3、Microsoft Azure Blob Storage 等）或内容分发网络（例如 Akamai、Amazon CloudFront 等）。
- 文件系统：完整的本地文件系统，或更大网络文件系统的一部分（例如 SAN、NAS 等）。
- Shell 脚本：用 Bash 等编写的单个 Shell 脚本。
- 等等。

容器本质上是围绕正在执行的代码或正在存储的数据的一个运行时边界。"容器"这个名称的选择是为了避免暗示其物理执行方式。例如，单个 Java EE 服务器（如 Apache Tomcat）可以在一个 Java 虚拟机中运行多个 Web 应用，而这些 Web 应用彼此基本隔离。在开发时，我可能让三个 Web 应用运行在同一个 Apache Tomcat 服务器上；而在生产环境中，每个 Web 应用可能部署到独立的 Apache Tomcat 服务器上。在这种情况下，每个 Web 应用都是一个"C4 容器"，而部署方式则是另一个独立的关注点。

**容器图**

在理解系统如何融入整体 IT 环境后，一个有用的下一步是通过容器图放大到系统边界内部。在 C4 中，容器是一个应用程序或数据存储。例如：服务端 Web 应用、客户端单页应用、桌面应用、移动应用、数据库模式、文件系统中的文件夹、Amazon Web Services S3 存储桶等。

容器图展示了软件架构的高层形态，以及职责如何在其中分布。它还显示了主要的技术选型，以及容器之间如何相互通信。这是一张简单、偏技术的高层图，对软件开发人员和运维/支持人员都有帮助。

#### library

在 C4-PlantUML 的 **Container diagram** 层级（通过引入 `C4_Container.puml` 或 `!include <C4/C4_Container>`），除了继承 Context 层级的全部宏外，新增/重点使用的宏如下：

##### 容器元素宏

- **Container(alias, label, techn, ?descr, ...)**：表示一个可部署的容器（如 Web 应用、API 服务），并指定技术栈。
- **ContainerDb(alias, label, techn, ?descr, ...)**：以数据库形状表示的容器（用于数据存储）。
- **ContainerQueue(alias, label, techn, ?descr, ...)**：以队列形状表示的容器（用于消息队列、事件流等）。
- **Container_Ext(alias, label, techn, ?descr, ...)**：表示外部容器。
- **ContainerDb_Ext(alias, label, techn, ?descr, ...)**：表示外部数据库容器。
- **ContainerQueue_Ext(alias, label, techn, ?descr, ...)**：表示外部队列容器。

##### 边界宏

- **Container_Boundary(alias, label, ...)**：绘制容器边界，用于对一组容器进行分组（常配合 `System_Boundary` 使用）。

##### 继承自 Context 层级（在 Container 图中仍常用）

- **Person / Person_Ext**：表示人员。
- **System / System_Ext**：表示软件系统。
- **System_Boundary / Enterprise_Boundary / Boundary**：各种边界。
- **Rel / BiRel / Rel_U / Rel_D / Rel_L / Rel_R / Rel_Neighbor / Rel_Back** 等：定义关系。

这些宏让你能够在系统边界内清晰展示可部署单元、技术选型以及它们之间的交互。

#### 示例

- 英文：`container/bigbank-container.puml`
- 中文：`container/bigbank-container.zh.puml`

### Component diagram

**组件**

"组件"一词在软件开发行业中被严重滥用，但在 C4 模型中，组件是一组相关功能的逻辑分组，这些功能被封装在一个定义良好的接口之后。如果你使用的是 Java 或 C# 这类语言，最简单的理解方式是：组件就是接口背后的一组实现类。

在 C4 模型中，组件并不是可单独部署的单元。可部署的单元是容器。换句话说，一个容器内的所有组件都运行在同一个进程空间中。组件如何被打包（例如一个 JAR 文件、DLL 或共享库中包含一个还是多个组件）则是另一个正交的关注点。

**组件与代码的关系**

组件是从你所使用的编程语言中的代码级构建块向上提升一个抽象层次的方式。例如：

- 面向对象编程语言（如 Java、C#、C++ 等）：组件由类和接口组成。
- 过程式编程语言（如 C）：组件可以由某个特定目录下的多个 C 文件组成。
- JavaScript：组件可以是一个由多个对象和函数组成的 JavaScript 模块。
- 函数式编程语言：组件可以是一个模块（F#、Haskell 等语言支持的概念），它是相关函数、类型等的逻辑分组。

如果你使用的是面向对象编程语言，那么你的组件将由一个或多个类来实现。

**组件图**

接下来，你可以进一步放大并分解一个容器，描述其中包含的组件，包括它们的职责以及技术/实现细节。

#### library

在 C4-PlantUML 的 **Component diagram** 层级（通过引入 `C4_Component.puml` 或 `!include <C4/C4_Component>`），除了继承 Context 与 Container 层级的全部宏外，新增的核心宏如下：

##### 组件元素宏

- **Component(alias, label, techn, ?descr, ...)**：表示容器内部的一个组件（相关功能的逻辑分组），并指定技术/实现方式。
- **ComponentDb(alias, label, techn, ?descr, ...)**：以数据库形状表示的组件（用于组件内部的数据存储或缓存）。
- **ComponentQueue(alias, label, techn, ?descr, ...)**：以队列形状表示的组件（用于组件内部的消息队列或缓冲）。
- **Component_Ext(alias, label, techn, ?descr, ...)**：表示外部组件。
- **ComponentDb_Ext(alias, label, techn, ?descr, ...)**：表示外部数据库形状的组件。
- **ComponentQueue_Ext(alias, label, techn, ?descr, ...)**：表示外部队列形状的组件。

##### 常用继承宏（在 Component 图中仍频繁使用）

- **Container / ContainerDb / ContainerQueue** 及其 `_Ext` 版本：表示同系统内的其他容器。
- **Container_Boundary**：绘制容器边界，用于限定当前正在分解的容器范围。
- **System / System_Ext**：表示外部或相关软件系统。
- **Person / Person_Ext**：表示人员。
- **Rel / BiRel / Rel_\*** 系列：定义组件与其他元素之间的关系。

这些宏让你能够进一步分解某个容器，展示其内部组件的职责、技术实现以及交互关系。

#### 示例

- 英文：`component/bigbank-component.puml`
- 中文：`component/bigbank-component.zh.puml`

### Code diagram

**代码**

最后，组件由一个或多个代码元素组成，这些元素使用你所采用的编程语言的基本构建块来构造——类、接口、枚举、函数、对象等。

**代码图**

最后，你可以进一步放大到某个组件，展示它如何以代码形式实现；通常使用 UML 类图、实体关系图或类似图示。

这是一个非常可选的细节层级，并且往往可以通过 IDE 等工具按需获取。理想情况下，此类图应由工具（例如 IDE 或 UML 建模工具）自动生成，并且你应只展示那些有助于讲述你想表达的故事的属性和方法。对于除了最重要或最复杂的组件之外的情况，不建议使用这一层级的细节。

#### library

C4-PlantUML 官方支持的图类型到 Component 为止，并不存在 `C4_Code.puml` 或专门针对 Code 层级的元素宏。通常直接使用 PlantUML 原生的 UML 类图语法（`class`、`interface`、`enum` 等）。

#### 示例

- 英文：`code/security-component.puml`
- 中文：`code/security-component.zh.puml`

### 补充图（Dynamic / Deployment）

C4-PlantUML 还支持动态图与部署图：

- **动态图**（`!include <C4/C4_Dynamic>`）：与 Container/Component 相同地声明元素，用 `Rel(...)` 描述交互，**按书写顺序自动编号**。
- **部署图**（`!include <C4/C4_Deployment>`）：`Deployment_Node(alias, label, ?type, ?descr, ...)`、`Node(...)`、`Node_L(...)`、`Node_R(...)`；节点内可放 `Container` / `ContainerDb` / `Component` 等表示部署的软件。

#### 示例

- 动态图：`dynamic/sign-in.puml` / `dynamic/sign-in.zh.puml`
- 部署图：`deployment/production.puml` / `deployment/production.zh.puml`

### 布局 / 图例 / 样式（通用）

- 图例：`SHOW_LEGEND()`、`SHOW_FLOATING_LEGEND(alias)`、`HIDE_STEREOTYPE()`
- 布局：`LAYOUT_TOP_DOWN()`、`LAYOUT_LEFT_RIGHT()`、`LAYOUT_LANDSCAPE()`、`UpdateLayoutConfig($c4ShapeInRow, $c4BoundaryInRow)`
- 样式：`AddElementTag(...)` / `AddRelTag(...)`、`UpdateElementStyle(alias, ...)`、`UpdateRelStyle(from, to, ...)`

> 注意：官方部分旧示例使用 `LAYOUT_WITH_LEGEND()`，该宏已过时，建议改用 `SHOW_LEGEND()`。

### 示例索引

| 图类型 | 英文 | 中文 |
|---|---|---|
| L1 系统上下文 | `context/bigbank-context.puml` | `context/bigbank-context.zh.puml` |
| L2 容器 | `container/bigbank-container.puml` | `container/bigbank-container.zh.puml` |
| L3 组件 | `component/bigbank-component.puml` | `component/bigbank-component.zh.puml` |
| 动态图 | `dynamic/sign-in.puml` | `dynamic/sign-in.zh.puml` |
| 部署图 | `deployment/production.puml` | `deployment/production.zh.puml` |
| L4 代码（UML 类图） | `code/security-component.puml` | `code/security-component.zh.puml` |

说明：

- `*.puml` 为英文原版 / 示例原文；`*.zh.puml` 为对应的中文翻译。
- 四个 C4 层级的英文示例为官方风格原文；动态图与部署图示例为本项目按官方宏整理。
- 英文示例保留官方旧宏 `LAYOUT_WITH_LEGEND()`；中文翻译使用推荐的 `SHOW_LEGEND()`。
- 所有 `.puml` 都会被 `scripts/diagrams.sh` 扫描，可用 `bun run diagrams:check` 校验。
