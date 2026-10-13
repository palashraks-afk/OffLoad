"""Headline numbers. See the methods page for the reasoning behind each one."""


def lower_bound_hours(n, p90_min, standard_min):
    """Least possible ambulance-hours stuck beyond the standard in one month.

    By definition of a 90th percentile, at least 10% of offloads took p90 or
    longer. Each of those exceeded the standard by at least (p90 - standard).
    Returns 0 when p90 is not above the standard (that is NOT 'no delay').
    """
    over = p90_min - standard_min
    if over <= 0:
        return 0.0
    return 0.10 * n * over / 60.0


def band(pct_compliant):
    """Crowding band from the share of handoffs that met the standard.

    green >= 90 (the state goal), yellow 75-89.9, red < 75.
    None means the share was not reported -> gray 'Not listed'/'unknown'.
    """
    if pct_compliant is None:
        return "gray"
    if pct_compliant >= 90:
        return "green"
    if pct_compliant >= 75:
        return "yellow"
    return "red"


def what_if_hours(n, p90_min, standard_min):
    """Hours returned if the hospital's lower-bound excess were removed.

    A scenario using the lower-bound formula, not a prediction of response times.
    """
    return lower_bound_hours(n, p90_min, standard_min)
