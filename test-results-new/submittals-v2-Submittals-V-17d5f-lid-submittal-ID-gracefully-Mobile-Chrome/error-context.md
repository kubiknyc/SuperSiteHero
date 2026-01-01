# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - main [ref=e4]:
      - generic [ref=e6]:
        - img [ref=e7]
        - paragraph [ref=e9]: Loading submittal...
    - navigation "Main navigation" [ref=e10]:
      - generic [ref=e11]:
        - link "Navigate to Dashboard" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
          - generic [ref=e19]: Home
        - link "Navigate to Projects" [ref=e20] [cursor=pointer]:
          - /url: /projects
          - img [ref=e22]
          - generic [ref=e24]: Projects
        - link "Navigate to Messages" [ref=e25] [cursor=pointer]:
          - /url: /messages
          - img [ref=e27]
          - generic [ref=e29]: Messages
        - link "Navigate to Daily Reports" [ref=e30] [cursor=pointer]:
          - /url: /daily-reports
          - img [ref=e32]
          - generic [ref=e35]: Reports
        - button "Open navigation menu" [ref=e36] [cursor=pointer]:
          - img [ref=e37]
          - generic [ref=e38]: More
  - generic:
    - button
    - button [ref=e39] [cursor=pointer]:
      - img [ref=e41]
      - generic:
        - img
```