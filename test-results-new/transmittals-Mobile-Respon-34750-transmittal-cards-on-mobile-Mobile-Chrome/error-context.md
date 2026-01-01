# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - main [ref=e4]:
      - generic [ref=e5]: Project ID is required
    - navigation "Main navigation" [ref=e6]:
      - generic [ref=e7]:
        - link "Navigate to Dashboard" [ref=e8] [cursor=pointer]:
          - /url: /
          - img [ref=e10]
          - generic [ref=e15]: Home
        - link "Navigate to Projects" [ref=e16] [cursor=pointer]:
          - /url: /projects
          - img [ref=e18]
          - generic [ref=e20]: Projects
        - link "Navigate to Messages" [ref=e21] [cursor=pointer]:
          - /url: /messages
          - img [ref=e23]
          - generic [ref=e25]: Messages
        - link "Navigate to Daily Reports" [ref=e26] [cursor=pointer]:
          - /url: /daily-reports
          - img [ref=e28]
          - generic [ref=e31]: Reports
        - button "Open navigation menu" [ref=e32] [cursor=pointer]:
          - img [ref=e33]
          - generic [ref=e34]: More
  - generic:
    - button
    - button [ref=e35] [cursor=pointer]:
      - img [ref=e37]
      - generic:
        - img
```